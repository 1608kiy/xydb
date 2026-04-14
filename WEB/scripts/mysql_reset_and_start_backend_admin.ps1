[CmdletBinding()]
param(
  [string]$MysqlServiceName = 'MySQL80',
  [string]$MysqlExe = 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe',
  [string]$MysqldExe = 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe',
  [string]$MyIni = 'C:\Program Files\MySQL\MySQL Server 8.0\my.ini',
  [string]$DbHost = '127.0.0.1',
  [int]$DbPort = 3306,
  [string]$DbName = 'xydb',
  [string]$DbUser = 'xydb',
  [string]$DbPass = 'Xydb_2026_Mysql_Pass_9Q2m',
  [string]$RootNewPass = 'Root_2026_Reset_9Q2m!A',
  [int]$ServerPort = 8082
)

$ErrorActionPreference = 'Stop'

function Assert-Admin {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  $p = New-Object Security.Principal.WindowsPrincipal($id)
  if (-not $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    $argList = @(
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      ('"' + $PSCommandPath + '"')
    )
    foreach ($k in $PSBoundParameters.Keys) {
      $v = $PSBoundParameters[$k]
      if ($v -is [string]) {
        $argList += ('-' + $k)
        $argList += ('"' + ($v -replace '"', '``"') + '"')
      } elseif ($v -is [int]) {
        $argList += ('-' + $k)
        $argList += [string]$v
      }
    }
    Start-Process -FilePath 'powershell.exe' -ArgumentList ($argList -join ' ') -Verb RunAs | Out-Null
    Write-Host 'Elevation requested. Please approve the UAC prompt.'
    exit 0
  }
}

function Wait-PortOpen {
  param([int]$Port, [int]$TimeoutSec = 20)
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    $ok = Test-NetConnection -ComputerName '127.0.0.1' -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($ok) { return $true }
    Start-Sleep -Milliseconds 300
  }
  return $false
}

function Invoke-MysqlNoPass {
  param([string]$Sql)
  & $MysqlExe --protocol=TCP -h $DbHost -P $DbPort -uroot -e $Sql
  if ($LASTEXITCODE -ne 0) { throw "mysql command failed: $LASTEXITCODE" }
}

function Test-XydbLogin {
  & $MysqlExe --protocol=TCP -h $DbHost -P $DbPort -u$DbUser -p$DbPass -e 'SELECT 1;' | Out-Null
  return ($LASTEXITCODE -eq 0)
}

Assert-Admin

if (-not (Test-Path $MysqlExe)) { throw "mysql.exe not found: $MysqlExe" }
if (-not (Test-Path $MysqldExe)) { throw "mysqld.exe not found: $MysqldExe" }
if (-not (Test-Path $MyIni)) { throw "my.ini not found: $MyIni" }

Write-Host '[1/7] Stop MySQL service'
Stop-Service -Name $MysqlServiceName -Force -ErrorAction Stop

Write-Host '[2/7] Start temporary mysqld with skip-grant-tables'
$tempProc = Start-Process -FilePath $MysqldExe -ArgumentList "--defaults-file=$MyIni","--console","--skip-grant-tables","--skip-networking=0","--port=$DbPort" -PassThru

if (-not (Wait-PortOpen -Port $DbPort -TimeoutSec 25)) {
  try { Stop-Process -Id $tempProc.Id -Force -ErrorAction SilentlyContinue } catch {}
  throw 'Temporary mysqld did not open port in time.'
}

Write-Host '[3/7] Reset root and app user grants'
$safeRoot = $RootNewPass.Replace("'","''")
$safeDbPass = $DbPass.Replace("'","''")
$sql = @(
  'FLUSH PRIVILEGES;',
  "CREATE DATABASE IF NOT EXISTS $DbName DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;",
  "ALTER USER 'root'@'localhost' IDENTIFIED BY '$safeRoot';",
  "CREATE USER IF NOT EXISTS '$DbUser'@'localhost' IDENTIFIED BY '$safeDbPass';",
  "CREATE USER IF NOT EXISTS '$DbUser'@'127.0.0.1' IDENTIFIED BY '$safeDbPass';",
  "ALTER USER '$DbUser'@'localhost' IDENTIFIED BY '$safeDbPass';",
  "ALTER USER '$DbUser'@'127.0.0.1' IDENTIFIED BY '$safeDbPass';",
  "GRANT ALL PRIVILEGES ON $DbName.* TO '$DbUser'@'localhost';",
  "GRANT ALL PRIVILEGES ON $DbName.* TO '$DbUser'@'127.0.0.1';",
  'FLUSH PRIVILEGES;'
) -join ' '
Invoke-MysqlNoPass -Sql $sql

Write-Host '[4/7] Stop temporary mysqld and restart service'
try { Stop-Process -Id $tempProc.Id -Force -ErrorAction SilentlyContinue } catch {}
Start-Sleep -Seconds 1
Start-Service -Name $MysqlServiceName -ErrorAction Stop

if (-not (Wait-PortOpen -Port $DbPort -TimeoutSec 20)) {
  throw 'MySQL service did not come back after restart.'
}

Write-Host '[5/7] Verify app account login'
if (-not (Test-XydbLogin)) {
  throw 'xydb login verification failed after reset.'
}

Write-Host '[6/7] Start backend with real MySQL'
$scriptDir = Split-Path -Parent $PSScriptRoot
$starter = Join-Path $scriptDir 'scripts\start_backend_mysql_real.ps1'
if (-not (Test-Path $starter)) {
  throw "Starter script not found: $starter"
}

& powershell -ExecutionPolicy Bypass -File $starter -DbHost $DbHost -DbPort $DbPort -DbName $DbName -DbUser $DbUser -DbPass $DbPass -RootUser root -RootPass $RootNewPass -ServerPort $ServerPort

Write-Host '[7/7] Completed'
Write-Host "Root password reset to: $RootNewPass"
Write-Host "App user: $DbUser / $DbPass"
