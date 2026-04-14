param(
    [string]$Server = "47.108.170.112",
    [string]$User = "root"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$tarPath = "E:\computer science\app\RingNoteApp-src.tgz"
if (-not (Test-Path -LiteralPath $tarPath)) {
    throw "Source archive not found: $tarPath"
}

Write-Host "Uploading app source archive..."
scp $tarPath "$User@$Server:/tmp/RingNoteApp-src.tgz"

$remote = @'
set -euo pipefail

export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export ANDROID_SDK_ROOT=/opt/android-sdk
export ANDROID_HOME=/opt/android-sdk
export PATH=/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools:$PATH

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

/opt/gradle/gradle-8.7/bin/gradle --no-daemon clean assembleDebug

mkdir -p /opt/ringnote-app/releases/android
cp -f app/build/outputs/apk/debug/app-debug.apk /opt/ringnote-app/releases/android/ringnote-debug.apk

ls -lh /opt/ringnote-app/releases/android/ringnote-debug.apk
'@

Write-Host "Building APK on server..."
ssh "$User@$Server" $remote

Write-Host "Done. Download URL (HTTP):"
Write-Host "http://ringnote.isleepring.cn/download/android/ringnote-debug.apk"
