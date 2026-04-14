[CmdletBinding()]
param(
  [string]$MysqlExe = 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe',
  [string]$DbHost = '127.0.0.1',
  [int]$DbPort = 3306,
  [string]$DbName = 'xydb',
  [string]$DbUser = 'xydb',
  [string]$DbPass = 'Xydb_2026_Mysql_Pass_9Q2m',
  [string]$RootUser = 'root',
  [string]$RootPass = '',
  [int]$ServerPort = 8082
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $root 'backend'

if (-not (Test-Path $MysqlExe)) {
  throw "mysql.exe not found: $MysqlExe"
}

function Test-MysqlLogin {
  param(
    [string]$User,
    [string]$Pass
  )

  $cmdArgs = @('--protocol=TCP', '-h', $DbHost, '-P', "$DbPort", "-u$User")
  if ($Pass -ne '') { $cmdArgs += "-p$Pass" }
  $cmdArgs += @('-e', 'SELECT 1;')

  & $MysqlExe @cmdArgs | Out-Null
  return ($LASTEXITCODE -eq 0)
}

function Invoke-Mysql {
  param(
    [string]$User,
    [string]$Pass,
    [string]$Sql
  )

  $cmdArgs = @('--protocol=TCP', '-h', $DbHost, '-P', "$DbPort", "-u$User")
  if ($Pass -ne '') { $cmdArgs += "-p$Pass" }
  $cmdArgs += @('-e', $Sql)
  & $MysqlExe @cmdArgs
  if ($LASTEXITCODE -ne 0) {
    throw "mysql command failed with exit code $LASTEXITCODE"
  }
}

Write-Host '[1/5] Checking MySQL account for app user'
$appUserOk = $false
try {
  $appUserOk = Test-MysqlLogin -User $DbUser -Pass $DbPass
} catch {
  $appUserOk = $false
}

if (-not $appUserOk) {
  if ([string]::IsNullOrWhiteSpace($RootPass)) {
    throw "DB login failed for '$DbUser'. Please provide -RootPass to auto-fix grants/password."
  }

  Write-Host '[2/5] App user login failed, fixing user with root account'
  $safePass = $DbPass.Replace("'", "''")
  $safeDb = $DbName.Replace("`"", "``")
  $sql = @(
    "CREATE DATABASE IF NOT EXISTS $safeDb DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;",
    "CREATE USER IF NOT EXISTS '$DbUser'@'localhost' IDENTIFIED BY '$safePass';",
    "CREATE USER IF NOT EXISTS '$DbUser'@'127.0.0.1' IDENTIFIED BY '$safePass';",
    "ALTER USER '$DbUser'@'localhost' IDENTIFIED BY '$safePass';",
    "ALTER USER '$DbUser'@'127.0.0.1' IDENTIFIED BY '$safePass';",
    "GRANT ALL PRIVILEGES ON $safeDb.* TO '$DbUser'@'localhost';",
    "GRANT ALL PRIVILEGES ON $safeDb.* TO '$DbUser'@'127.0.0.1';",
    'FLUSH PRIVILEGES;'
  ) -join ' '
  Invoke-Mysql -User $RootUser -Pass $RootPass -Sql $sql

  Write-Host '[3/5] Rechecking app user login'
  $appUserOk = Test-MysqlLogin -User $DbUser -Pass $DbPass
  if (-not $appUserOk) {
    throw "App user '$DbUser' still cannot login after fix."
  }
} else {
  Write-Host '[2/5] App user login OK'
}

Write-Host '[4/5] Starting backend with real MySQL settings'

$env:SPRING_DATASOURCE_URL = "jdbc:mysql://${DbHost}:$DbPort/$DbName?serverTimezone=Asia/Shanghai&useSSL=false&allowPublicKeyRetrieval=true"
$env:SPRING_DATASOURCE_USERNAME = $DbUser
$env:SPRING_DATASOURCE_PASSWORD = $DbPass

$conn = Get-NetTCPConnection -LocalPort $ServerPort -State Listen -ErrorAction SilentlyContinue
if ($conn) {
  ($conn | Select-Object -ExpandProperty OwningProcess -Unique) | ForEach-Object {
    Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
  }
}

Push-Location $backendDir
try {
  & .\mvnw.cmd -f .\pom.xml spring-boot:run "-Dspring-boot.run.arguments=--server.port=$ServerPort"
} finally {
  Pop-Location
}
