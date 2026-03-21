param(
  [int]$BackendPort = 8080,
  [int]$StartupTimeoutSeconds = 120,
  [switch]$NoWait
)

$ErrorActionPreference = 'Stop'

function Test-BackendPort {
  param([int]$Port)

  try {
    $result = Test-NetConnection -ComputerName 'localhost' -Port $Port -WarningAction SilentlyContinue
    return [bool]$result.TcpTestSucceeded
  } catch {
    return $false
  }
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir '..')
$backendDir = Join-Path $repoRoot 'backend'
$frontendDir = Join-Path $repoRoot 'frontend'
$outLog = Join-Path $backendDir 'backend_run.log'
$errLog = Join-Path $backendDir 'backend_run.err'

$loginPage = $null
$htmlFiles = Get-ChildItem -Path $frontendDir -Filter '*.html' -File -ErrorAction SilentlyContinue
foreach ($file in $htmlFiles) {
  try {
    $content = Get-Content -LiteralPath $file.FullName -Raw -ErrorAction Stop
    if ($content -match 'id="login-form"') {
      $loginPage = $file.FullName
      break
    }
  } catch {
    continue
  }
}

if (-not $loginPage) {
  throw "Login page not found by marker id=`"login-form`" under: $frontendDir"
}

if (-not (Test-Path $backendDir)) {
  throw "Backend directory not found: $backendDir"
}

$alreadyRunning = Test-BackendPort -Port $BackendPort

if ($alreadyRunning) {
  Write-Output "Backend is already running on port $BackendPort"
} else {
  Write-Output "Backend is not running. Starting backend with local profile..."

  if (Test-Path $outLog) { Remove-Item $outLog -Force }
  if (Test-Path $errLog) { Remove-Item $errLog -Force }

  # Use cmd.exe here to avoid PowerShell argument parsing issues with Maven -D options.
  $proc = Start-Process -FilePath 'cmd.exe' `
    -ArgumentList '/c .\mvnw.cmd -Dspring-boot.run.profiles=local spring-boot:run' `
    -WorkingDirectory $backendDir `
    -RedirectStandardOutput $outLog `
    -RedirectStandardError $errLog `
    -PassThru

  Write-Output ("Backend process started. PID=" + $proc.Id)

  if (-not $NoWait) {
    $ready = $false
    for ($i = 0; $i -lt $StartupTimeoutSeconds; $i++) {
      if (Test-BackendPort -Port $BackendPort) {
        $ready = $true
        break
      }
      Start-Sleep -Seconds 1
    }

    if ($ready) {
      Write-Output "Backend is ready on port $BackendPort"
    } else {
      Write-Warning "Backend did not become ready within $StartupTimeoutSeconds seconds."
      Write-Warning "Check logs: $outLog and $errLog"
    }
  }
}

Start-Process -FilePath $loginPage
Write-Output "Login page opened: $loginPage"
