[CmdletBinding()]
param(
  [string]$ApiBase = 'http://localhost:8082',
  [int]$StartupTimeoutSec = 150,
  [string]$OutputDir = ''
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $root 'backend'
$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
if ([string]::IsNullOrWhiteSpace($OutputDir)) {
  $OutputDir = Join-Path $root 'REPORTS\e2e'
}
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

$startOut = Join-Path $OutputDir ("min_acceptance_start_" + $timestamp + ".out.log")
$startErr = Join-Path $OutputDir ("min_acceptance_start_" + $timestamp + ".err.log")
$jsonOut = Join-Path $OutputDir ("min_acceptance_" + $timestamp + ".json")
$mdOut = Join-Path $OutputDir ("min_acceptance_" + $timestamp + ".md")

$port = ([Uri]$ApiBase).Port
$backendProc = $null

function Stop-PortListeners {
  param([int]$Port, [int]$KeepPid = 0)
  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if ($conn) {
    ($conn | Select-Object -ExpandProperty OwningProcess -Unique) | ForEach-Object {
      if ($KeepPid -gt 0 -and $_ -eq $KeepPid) { return }
      Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
    }
  }
}

function Wait-PortOpen {
  param([int]$Port, [int]$TimeoutSec)
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    if (Test-NetConnection -ComputerName 'localhost' -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue) {
      return $true
    }
    Start-Sleep -Seconds 1
  }
  return $false
}

function New-CaseResult {
  param([string]$Name)
  $obj = [ordered]@{}
  $obj.case = $Name
  $obj.passed = $false
  $obj.details = @()
  $obj.error = ''
  return $obj
}

function Add-Detail {
  param($Case, [string]$Text)
  $Case.details += $Text
}

function Invoke-Api {
  param([string]$Method, [string]$Path, $Body = $null, [string]$Token = '')

  $url = if ($Path.StartsWith('http')) { $Path } else { ($ApiBase.TrimEnd('/') + '/' + $Path.TrimStart('/')) }
  $headers = @{}
  if ($Token) { $headers['Authorization'] = "Bearer $Token" }

  try {
    if ($PSBoundParameters.ContainsKey('Body')) {
      $json = if ($Body -is [string]) { $Body } else { ($Body | ConvertTo-Json -Depth 8 -Compress) }
      $resp = Invoke-WebRequest -Uri $url -Method $Method -Headers $headers -ContentType 'application/json' -Body $json -UseBasicParsing -ErrorAction Stop
    }
    else {
      $resp = Invoke-WebRequest -Uri $url -Method $Method -Headers $headers -UseBasicParsing -ErrorAction Stop
    }

    $obj = $null
    try { $obj = $resp.Content | ConvertFrom-Json } catch { $obj = $resp.Content }
    return [ordered]@{ ok = $true; status = [int]$resp.StatusCode; body = $obj; raw = $resp.Content }
  }
  catch {
    if ($_.Exception.Response) {
      $res = $_.Exception.Response
      $status = 0
      try { $status = [int]$res.StatusCode.value__ } catch {}
      $bodyText = ''
      try {
        $sr = New-Object System.IO.StreamReader($res.GetResponseStream())
        $bodyText = $sr.ReadToEnd()
        $sr.Close()
      } catch {}
      $obj = $null
      try { $obj = $bodyText | ConvertFrom-Json } catch { $obj = $bodyText }
      return [ordered]@{ ok = $false; status = $status; body = $obj; raw = $bodyText }
    }
    return [ordered]@{ ok = $false; status = 0; body = $_.Exception.Message; raw = '' }
  }
}

function Get-ListData {
  param($Body)
  if ($null -eq $Body) { return @() }
  if ($Body.data -is [System.Collections.IEnumerable] -and -not ($Body.data -is [string])) { return @($Body.data) }
  if ($Body.data -and $Body.data.list) { return @($Body.data.list) }
  if ($Body.data -and $Body.data.records) { return @($Body.data.records) }
  return @()
}

$startedAt = Get-Date
$cases = @()
$runningCase = $null

try {
  Stop-PortListeners -Port $port
  if (Test-Path $startOut) { Remove-Item $startOut -Force }
  if (Test-Path $startErr) { Remove-Item $startErr -Force }

  $mvnCmd = '.\\mvnw.cmd -f .\\pom.xml spring-boot:run "-Dspring-boot.run.profiles=local" "-Dspring-boot.run.arguments=--server.port=' + $port + '"'
  $backendProc = Start-Process -FilePath 'cmd.exe' -WorkingDirectory $backendDir -ArgumentList '/c', $mvnCmd -RedirectStandardOutput $startOut -RedirectStandardError $startErr -PassThru

  if (-not (Wait-PortOpen -Port $port -TimeoutSec $StartupTimeoutSec)) {
    throw "backend startup timeout on port $port"
  }

  $rand = Get-Random -Maximum 999999
  $email = "accept-$rand-$(Get-Date -Format yyyyMMddHHmmss)@example.test"
  $password = 'AcceptPass123!'
  $nickname = "accept-$rand"
  $token = ''
  $taskId = ''

  $runningCase = New-CaseResult -Name 'case1_register_login_me'
  $reg = Invoke-Api -Method 'POST' -Path '/api/auth/register' -Body @{ nickname = $nickname; email = $email; password = $password }
  Add-Detail -Case $runningCase -Text ("register=" + $reg.status)
  if (-not $reg.ok) { throw 'case1 register failed' }
  $login = Invoke-Api -Method 'POST' -Path '/api/auth/login' -Body @{ email = $email; password = $password }
  Add-Detail -Case $runningCase -Text ("login=" + $login.status)
  if (-not $login.ok) { throw 'case1 login failed' }
  try { $token = [string]$login.body.data.token } catch { $token = '' }
  if ([string]::IsNullOrWhiteSpace($token)) { throw 'case1 token missing' }
  $me = Invoke-Api -Method 'GET' -Path '/api/me' -Token $token
  Add-Detail -Case $runningCase -Text ("me=" + $me.status)
  if (-not $me.ok) { throw 'case1 me failed' }
  $runningCase.passed = $true
  $cases += $runningCase

  $runningCase = New-CaseResult -Name 'case2_3_task_create_update_consistency'
  $createTask = Invoke-Api -Method 'POST' -Path '/api/tasks' -Token $token -Body @{ title = ('accept-task-' + (Get-Date -Format 'HHmmss')); description = 'acceptance'; priority = 'high'; tags = '["work"]'; status = 'pending' }
  Add-Detail -Case $runningCase -Text ("create_task=" + $createTask.status)
  if (-not $createTask.ok) { throw 'case2 create task failed' }
  try { $taskId = [string]$createTask.body.data.id } catch { $taskId = '' }
  if ([string]::IsNullOrWhiteSpace($taskId)) { throw 'case2 task id missing' }
  $tasks1 = Invoke-Api -Method 'GET' -Path '/api/tasks' -Token $token
  if (-not $tasks1.ok) { throw 'case2 list failed' }
  $arr1 = Get-ListData -Body $tasks1.body
  if (-not ($arr1 | Where-Object { [string]$_.id -eq $taskId })) { throw 'case2 task not listed' }
  $upd = Invoke-Api -Method 'PUT' -Path ('/api/tasks/' + $taskId) -Token $token -Body @{ status = 'completed' }
  Add-Detail -Case $runningCase -Text ("update_task=" + $upd.status)
  if (-not $upd.ok) { throw 'case3 update failed' }
  $tasks2 = Invoke-Api -Method 'GET' -Path '/api/tasks' -Token $token
  if (-not $tasks2.ok) { throw 'case3 list after update failed' }
  $arr2 = Get-ListData -Body $tasks2.body
  $t = $arr2 | Where-Object { [string]$_.id -eq $taskId } | Select-Object -First 1
  if (-not $t) { throw 'case3 task missing after update' }
  if ([string]$t.status -ne 'completed') { throw 'case3 status mismatch' }
  $runningCase.passed = $true
  $cases += $runningCase

  $runningCase = New-CaseResult -Name 'case4_pomodoro_and_reports'
  $pomo = Invoke-Api -Method 'POST' -Path '/api/pomodoros' -Token $token -Body @{ mode = 'focus'; plannedMinutes = 25; actualMinutes = 25; completed = $true; task = @{ id = [int]$taskId } }
  Add-Detail -Case $runningCase -Text ("create_pomodoro=" + $pomo.status)
  if (-not $pomo.ok) { throw 'case4 create pomodoro failed' }
  $ov = Invoke-Api -Method 'GET' -Path '/api/reports/overview' -Token $token
  $dy = Invoke-Api -Method 'GET' -Path '/api/reports/daily-trend' -Token $token
  $ct = Invoke-Api -Method 'GET' -Path '/api/reports/task-category' -Token $token
  Add-Detail -Case $runningCase -Text ("overview=" + $ov.status + ', daily=' + $dy.status + ', category=' + $ct.status)
  if (-not ($ov.ok -and $dy.ok -and $ct.ok)) { throw 'case4 report endpoint failed' }
  $runningCase.passed = $true
  $cases += $runningCase

  $runningCase = New-CaseResult -Name 'case5_checkin_create_and_query'
  $todayKey = (Get-Date).ToString('yyyy-MM-dd')
  $timeKey = (Get-Date).ToString('HH:mm')
  $ck = Invoke-Api -Method 'POST' -Path '/api/checkins' -Token $token -Body @{ date = $todayKey; time = $timeKey; type = 'study'; note = 'acceptance checkin' }
  Add-Detail -Case $runningCase -Text ("create_checkin=" + $ck.status)
  if (-not $ck.ok) { throw 'case5 create checkin failed' }
  $recent = Invoke-Api -Method 'GET' -Path '/api/checkins/recent' -Token $token
  $calendarPath = '/api/checkins/calendar?year=' + (Get-Date).Year + '&month=' + (Get-Date).Month
  $calendar = Invoke-Api -Method 'GET' -Path $calendarPath -Token $token
  Add-Detail -Case $runningCase -Text ("recent=" + $recent.status + ', calendar=' + $calendar.status)
  if (-not ($recent.ok -and $calendar.ok)) { throw 'case5 checkin query failed' }
  $runningCase.passed = $true
  $cases += $runningCase
}
catch {
  $msg = $_.Exception.Message
  if ($null -ne $runningCase -and -not $runningCase.passed) {
    $runningCase.error = $msg
    $cases += $runningCase
  }
  else {
    $failed = New-CaseResult -Name 'execution_failure'
    $failed.error = $msg
    $cases += $failed
  }
}
finally {
  if ($backendProc -and -not $backendProc.HasExited) {
    Stop-Process -Id $backendProc.Id -Force -ErrorAction SilentlyContinue
  }
  Stop-PortListeners -Port $port
}

$finishedAt = Get-Date
$overall = (($cases | Where-Object { -not $_.passed }).Count -eq 0)

$result = [ordered]@{}
$result.suite = 'min-acceptance-5-cases'
$result.generatedAt = $finishedAt.ToString('s')
$result.apiBase = $ApiBase
$result.durationSeconds = [int](($finishedAt - $startedAt).TotalSeconds)
$result.overallPassed = $overall
$result.cases = $cases
$result.artifacts = [ordered]@{ startupOut = $startOut; startupErr = $startErr; json = $jsonOut; markdown = $mdOut }

$result | ConvertTo-Json -Depth 8 | Set-Content -Path $jsonOut -Encoding UTF8

$md = @()
$md += '# Min Acceptance Report (5 Cases)'
$md += ''
$md += ('- Generated: ' + $result.generatedAt)
$md += ('- API Base: ' + $result.apiBase)
$md += ('- Overall: ' + ($(if ($overall) { 'PASS' } else { 'FAIL' })))
$md += ('- Duration: ' + $result.durationSeconds + 's')
$md += ''
$md += '## Case Results'
foreach ($c in $cases) {
  $md += ('- ' + $c.case + ': ' + ($(if ($c.passed) { 'PASS' } else { 'FAIL' })))
  foreach ($d in $c.details) {
    $md += ('  - ' + $d)
  }
  if ($c.error) {
    $md += ('  - error: ' + $c.error)
  }
}
$md += ''
$md += '## Artifacts'
$md += ('- JSON: ' + $jsonOut)
$md += ('- Markdown: ' + $mdOut)
$md += ('- Startup Out: ' + $startOut)
$md += ('- Startup Err: ' + $startErr)

$md -join "`r`n" | Set-Content -Path $mdOut -Encoding UTF8

if ($overall) {
  Write-Output 'MIN_ACCEPTANCE_PASS'
  Write-Output ('REPORT_JSON=' + $jsonOut)
  Write-Output ('REPORT_MD=' + $mdOut)
  exit 0
}

Write-Output 'MIN_ACCEPTANCE_FAIL'
Write-Output ('REPORT_JSON=' + $jsonOut)
Write-Output ('REPORT_MD=' + $mdOut)
exit 1
