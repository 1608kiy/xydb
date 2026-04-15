param(
    [string]$Server = "47.108.170.112",
  [string]$User = "root",
  [int]$Port = 22,
  [int]$Retries = 3,
  [string]$SourceDir = "E:\computer science\app\RingNoteApp",
  [int]$SafeMode = 1,
  [int]$BuildTimeoutMinutes = 55
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$manifestPath = Join-Path $SourceDir "app\src\main\AndroidManifest.xml"
$appGradlePath = Join-Path $SourceDir "app\build.gradle"
$settingsGradlePath = Join-Path $SourceDir "settings.gradle"

if (-not (Test-Path -LiteralPath $manifestPath) -or -not (Test-Path -LiteralPath $appGradlePath) -or -not (Test-Path -LiteralPath $settingsGradlePath)) {
    throw "Invalid Android source directory: $SourceDir . Required files missing (app/src/main/AndroidManifest.xml, app/build.gradle, settings.gradle)."
}

$tarPath = Join-Path $env:TEMP "RingNoteApp-src.tgz"
if (Test-Path -LiteralPath $tarPath) {
  Remove-Item -LiteralPath $tarPath -Force -ErrorAction SilentlyContinue
}

Write-Host "Creating source archive from: $SourceDir"
$sourceParent = Split-Path -Path $SourceDir -Parent
$sourceLeaf = Split-Path -Path $SourceDir -Leaf
tar -czf $tarPath -C $sourceParent $sourceLeaf
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $tarPath)) {
  throw "Failed to create source archive from $SourceDir"
}

Write-Host "Uploading app source archive..."
$target = "${User}@${Server}:/tmp/RingNoteApp-src.tgz"
for ($i = 1; $i -le $Retries; $i++) {
  scp -P $Port $tarPath $target
  if ($LASTEXITCODE -eq 0) { break }
  if ($i -eq $Retries) { throw "SCP failed after $Retries attempts." }
  Write-Host "SCP failed, retrying ($i/$Retries)..."
}

$remote = @'
set -euo pipefail

export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export ANDROID_SDK_ROOT=/opt/android-sdk
export ANDROID_HOME=/opt/android-sdk
export PATH=/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools:$PATH

SAFE_MODE=__SAFE_MODE__
BUILD_TIMEOUT_MINUTES=__BUILD_TIMEOUT_MINUTES__
BACKEND_WAS_ACTIVE=0
MYSQL_WAS_ACTIVE=0

if [ "$SAFE_MODE" = "1" ]; then
  if systemctl is-active --quiet ringnote-backend; then
    BACKEND_WAS_ACTIVE=1
    systemctl stop ringnote-backend || true
  fi
  if systemctl is-active --quiet mysql; then
    MYSQL_WAS_ACTIVE=1
    systemctl stop mysql || true
  fi
fi

cleanup() {
  if [ "$MYSQL_WAS_ACTIVE" -eq 1 ]; then
    systemctl start mysql || true
  fi
  if [ "$BACKEND_WAS_ACTIVE" -eq 1 ]; then
    systemctl start ringnote-backend || true
  fi
}
trap cleanup EXIT

# Low-memory server safety: ensure enough swap exists to avoid Gradle OOM kill.
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
fi
swapon /swapfile || true

SWAP_TOTAL_MB=$(swapon --show=SIZE --bytes --noheadings 2>/dev/null | awk '{sum+=$1} END {print int(sum/1024/1024)}')
if [ -z "$SWAP_TOTAL_MB" ]; then SWAP_TOTAL_MB=0; fi
if [ "$SWAP_TOTAL_MB" -lt 4096 ] && [ ! -f /swapfile2 ]; then
  fallocate -l 2G /swapfile2 || dd if=/dev/zero of=/swapfile2 bs=1M count=2048
  chmod 600 /swapfile2
  mkswap /swapfile2
fi
if [ -f /swapfile2 ]; then
  swapon /swapfile2 || true
fi

if [ ! -x /opt/gradle/gradle-8.7/bin/gradle ]; then
  mkdir -p /opt/gradle
  cd /tmp
  wget -q https://services.gradle.org/distributions/gradle-8.7-bin.zip -O gradle-8.7-bin.zip
  unzip -q -o gradle-8.7-bin.zip -d /opt/gradle
fi

mkdir -p /opt/ringnote-app/mobile
rm -rf /opt/ringnote-app/mobile/RingNoteApp
mkdir -p /opt/ringnote-app/mobile

tar -xzf /tmp/RingNoteApp-src.tgz -C /opt/ringnote-app/mobile
cd /opt/ringnote-app/mobile/RingNoteApp

BUILD_LOG=/tmp/ringnote_android_build.log
set +e
timeout ${BUILD_TIMEOUT_MINUTES}m ionice -c3 nice -n 10 /opt/gradle/gradle-8.7/bin/gradle --no-daemon --max-workers=1 -Dorg.gradle.jvmargs='-Xmx512m -XX:MaxMetaspaceSize=192m -Dfile.encoding=UTF-8' -Dorg.gradle.internal.http.connectionTimeout=120000 -Dorg.gradle.internal.http.socketTimeout=120000 assembleDebug > "$BUILD_LOG" 2>&1
GRADLE_EXIT=$?
set -e

if [ "$GRADLE_EXIT" -ne 0 ]; then
  echo "Build failed, showing tail log:" >&2
  tail -n 120 "$BUILD_LOG" >&2 || true
  exit "$GRADLE_EXIT"
fi

mkdir -p /opt/ringnote-app/releases/android
if [ ! -f app/build/outputs/apk/debug/app-debug.apk ]; then
  echo "APK not found after build." >&2
  tail -n 120 "$BUILD_LOG" >&2 || true
  exit 2
fi

cp -f app/build/outputs/apk/debug/app-debug.apk /opt/ringnote-app/releases/android/ringnote-debug.apk

ls -lh /opt/ringnote-app/releases/android/ringnote-debug.apk
'@

Write-Host "Building APK on server..."
$localRemoteScript = Join-Path $env:TEMP "ringnote_build_apk_remote.sh"
$safeModeValue = if ($SafeMode -ne 0) { "1" } else { "0" }
$remote = $remote -replace "__SAFE_MODE__", $safeModeValue
$remote = $remote -replace "__BUILD_TIMEOUT_MINUTES__", $BuildTimeoutMinutes
$remoteLf = $remote -replace "`r`n", "`n"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($localRemoteScript, $remoteLf, $utf8NoBom)

for ($i = 1; $i -le $Retries; $i++) {
  scp -P $Port $localRemoteScript "${User}@${Server}:/tmp/ringnote_build_apk_remote.sh"
  if ($LASTEXITCODE -ne 0) {
    if ($i -eq $Retries) { throw "SCP remote script failed after $Retries attempts." }
    Write-Host "SCP remote script failed, retrying ($i/$Retries)..."
    continue
  }

  ssh -p $Port "${User}@${Server}" "bash /tmp/ringnote_build_apk_remote.sh"
  if ($LASTEXITCODE -eq 0) { break }
  if ($i -eq $Retries) { throw "SSH build failed after $Retries attempts." }
  Write-Host "SSH build failed, retrying ($i/$Retries)..."
}

Remove-Item -LiteralPath $localRemoteScript -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $tarPath -Force -ErrorAction SilentlyContinue

Write-Host "Done. Download URL (HTTP):"
Write-Host "http://ringnote.isleepring.cn/download/android/ringnote-debug.apk"
