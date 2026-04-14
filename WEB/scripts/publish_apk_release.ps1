param(
    [Parameter(Mandatory = $true)]
    [string]$ApkPath,

    [Parameter(Mandatory = $true)]
    [string]$VersionName,

    [Parameter(Mandatory = $true)]
    [int]$VersionCode,

    [string]$Channel = "stable",
    [string]$PackageName = "com.ringnote.app",
    [string]$BaseUrl = "https://ringnote.isleepring.cn/download/android",
    [string]$OutputDir = "WEB/releases/android"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $ApkPath)) {
    throw "APK file not found: $ApkPath"
}

New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

$sourceApk = Resolve-Path -LiteralPath $ApkPath
$apkName = "ringnote-v$VersionName-$VersionCode.apk"
$targetApk = Join-Path $OutputDir $apkName
Copy-Item -LiteralPath $sourceApk -Destination $targetApk -Force

$hash = Get-FileHash -Algorithm SHA256 -LiteralPath $targetApk
$fileInfo = Get-Item -LiteralPath $targetApk
$publishedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

$metadata = [ordered]@{
    appName = "RingNote"
    packageName = $PackageName
    channel = $Channel
    versionName = $VersionName
    versionCode = $VersionCode
    minSupportedCode = 1
    apk = [ordered]@{
        fileName = $apkName
        url = "$BaseUrl/$apkName"
        sha256 = $hash.Hash.ToLowerInvariant()
        size = [int64]$fileInfo.Length
    }
    releaseNotes = @(
        "Fixes and performance improvements"
    )
    publishedAt = $publishedAt
    forceUpdate = $false
}

$versionJsonPath = Join-Path $OutputDir "version.json"
$metadata | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $versionJsonPath -Encoding UTF8

Write-Host "Release metadata generated: $versionJsonPath"
Write-Host "APK published to: $targetApk"
Write-Host ""
Write-Host "Next step (upload to server):"
Write-Host "scp \"$targetApk\" root@47.108.170.112:/opt/ringnote-app/releases/android/"
Write-Host "scp \"$versionJsonPath\" root@47.108.170.112:/opt/ringnote-app/releases/android/"
