<#
一键后端回归脚本（Windows/PowerShell）：
1) 执行 backend 单元测试（可选跳过）
2) local profile 启动后端（默认 8082）
3) 调用 scripts/verify_api.ps1 做 API 冒烟
4) 结束后自动清理进程与端口监听

用法示例：
  powershell -ExecutionPolicy Bypass -File .\scripts\run_regression.ps1
  powershell -ExecutionPolicy Bypass -File .\scripts\run_regression.ps1 -ApiBase 'http://localhost:8082' -SkipTests
#>

[CmdletBinding()]
param(
  [string]$ApiBase = 'http://localhost:8082',
  [switch]$SkipTests,
  [int]$StartupTimeoutSec = 120
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $root 'backend'
$verifyScript = Join-Path $root 'scripts\verify_api.ps1'
$startupOutLog = Join-Path $backendDir 'regression_start.out.log'
$startupErrLog = Join-Path $backendDir 'regression_start.err.log'

if (-not (Test-Path (Join-Path $backendDir 'mvnw.cmd'))) {
  throw "Cannot find backend/mvnw.cmd under: $backendDir"
}
if (-not (Test-Path $verifyScript)) {
  throw "Cannot find verify script: $verifyScript"
}

$uri = [Uri]$ApiBase
$port = $uri.Port
$backendProc = $null

function Stop-PortListeners {
  param([int]$Port)
  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if ($conn) {
    ($conn | Select-Object -ExpandProperty OwningProcess -Unique) | ForEach-Object {
      if ($backendProc -and $_ -eq $backendProc.Id) { return }
      Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
      Write-Host ("Stopped stale listener PID=" + $_)
    }
  }
}

function Wait-PortOpen {
  param(
    [int]$Port,
    [int]$TimeoutSec
  )
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    $open = Test-NetConnection -ComputerName 'localhost' -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($open) { return $true }
    Start-Sleep -Seconds 1
  }
  return $false
}

function Show-StartupLogs {
  if (Test-Path $startupOutLog) {
    Write-Host '--- startup stdout tail ---'
    Get-Content $startupOutLog -Tail 80 -ErrorAction SilentlyContinue | Write-Host
  }
  if (Test-Path $startupErrLog) {
    Write-Host '--- startup stderr tail ---'
    Get-Content $startupErrLog -Tail 80 -ErrorAction SilentlyContinue | Write-Host
  }
}

try {
  Write-Host "[1/4] Preparing port $port"
  Stop-PortListeners -Port $port

  if (-not $SkipTests) {
    Write-Host '[2/4] Running backend tests'
    & (Join-Path $backendDir 'mvnw.cmd') '-f' (Join-Path $backendDir 'pom.xml') '-q' 'test'
  } else {
    Write-Host '[2/4] Skipped backend tests by parameter'
  }

  Write-Host "[3/4] Starting backend with local profile at $ApiBase"
  if (Test-Path $startupOutLog) { Remove-Item $startupOutLog -Force }
  if (Test-Path $startupErrLog) { Remove-Item $startupErrLog -Force }

  $mvnCommand = '.\\mvnw.cmd -f .\\pom.xml spring-boot:run "-Dspring-boot.run.profiles=local" "-Dspring-boot.run.arguments=--server.port=' + $port + '"'
  $backendProc = Start-Process -FilePath 'cmd.exe' -WorkingDirectory $backendDir -ArgumentList '/c', $mvnCommand -RedirectStandardOutput $startupOutLog -RedirectStandardError $startupErrLog -PassThru
  Write-Host ("Backend PID=" + $backendProc.Id)

  if (-not (Wait-PortOpen -Port $port -TimeoutSec $StartupTimeoutSec)) {
    if ($backendProc.HasExited) {
      Show-StartupLogs
      throw "Backend exited unexpectedly with code $($backendProc.ExitCode)"
    }
    Show-StartupLogs
    throw "Backend startup timeout: port $port is still closed after $StartupTimeoutSec seconds"
  }

  Write-Host '[4/4] Running API verification script'
  & powershell -ExecutionPolicy Bypass -File $verifyScript -ApiBase $ApiBase
  if ($LASTEXITCODE -ne 0) {
    throw "verify_api.ps1 failed with exit code $LASTEXITCODE"
  }

  Write-Host 'REGRESSION_PASS'
  exit 0
}
catch {
  Write-Error $_
  exit 1
}
finally {
  if ($backendProc -and -not $backendProc.HasExited) {
    Stop-Process -Id $backendProc.Id -Force -ErrorAction SilentlyContinue
    Write-Host ("Stopped backend PID=" + $backendProc.Id)
  }
  Stop-PortListeners -Port $port
}
