<#
Runs a graduation-level backend verification suite and writes structured reports.
Outputs:
- REPORTS/e2e/graduation_suite_<timestamp>.json
- REPORTS/e2e/graduation_suite_<timestamp>.md

Usage:
  powershell -ExecutionPolicy Bypass -File .\scripts\run_graduation_suite.ps1
  powershell -ExecutionPolicy Bypass -File .\scripts\run_graduation_suite.ps1 -ApiBase 'http://localhost:8082'
#>

[CmdletBinding()]
param(
  [string]$ApiBase = 'http://localhost:8082',
  [int]$StartupTimeoutSec = 120,
  [string]$OutputDir = ''
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $root 'backend'
$regressionScript = Join-Path $root 'scripts\run_regression.ps1'
$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'

if ([string]::IsNullOrWhiteSpace($OutputDir)) {
  $OutputDir = Join-Path $root 'REPORTS\e2e'
}
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

$testLog = Join-Path $OutputDir ("graduation_suite_tests_" + $timestamp + ".log")
$smokeLog = Join-Path $OutputDir ("graduation_suite_smoke_" + $timestamp + ".log")
$jsonOut = Join-Path $OutputDir ("graduation_suite_" + $timestamp + ".json")
$mdOut = Join-Path $OutputDir ("graduation_suite_" + $timestamp + ".md")

function Get-SurefireSummary {
  param([string]$SurefireDir)

  $summary = [ordered]@{
    testSuites = 0
    tests = 0
    failures = 0
    errors = 0
    skipped = 0
    timeSeconds = 0.0
  }

  if (-not (Test-Path $SurefireDir)) {
    return $summary
  }

  Get-ChildItem -Path $SurefireDir -Filter 'TEST-*.xml' -File -ErrorAction SilentlyContinue | ForEach-Object {
    try {
      [xml]$xml = Get-Content -Path $_.FullName -Raw
      $suite = $xml.testsuite
      if ($null -ne $suite) {
        $summary.testSuites += 1
        $summary.tests += [int]$suite.tests
        $summary.failures += [int]$suite.failures
        $summary.errors += [int]$suite.errors
        $summary.skipped += [int]$suite.skipped
        $summary.timeSeconds += [double]$suite.time
      }
    } catch {
      # ignore malformed files and continue
    }
  }

  return $summary
}

function Invoke-And-Log {
  param(
    [string]$Command,
    [string]$LogFile,
    [string]$WorkingDirectory
  )

  $cmd = '/c ' + $Command + ' 1>"' + $LogFile + '" 2>&1'
  $proc = Start-Process -FilePath 'cmd.exe' -WorkingDirectory $WorkingDirectory -ArgumentList $cmd -PassThru -Wait
  return $proc.ExitCode
}

$startedAt = Get-Date

Write-Host '[1/3] Running backend tests (mvn test) ...'
$testCmd = '.\mvnw.cmd -f .\pom.xml test'
$testExit = Invoke-And-Log -Command $testCmd -LogFile $testLog -WorkingDirectory $backendDir
$surefireSummary = Get-SurefireSummary -SurefireDir (Join-Path $backendDir 'target\surefire-reports')

Write-Host '[2/3] Running API smoke regression ...'
& powershell -ExecutionPolicy Bypass -File $regressionScript -ApiBase $ApiBase -SkipTests -StartupTimeoutSec $StartupTimeoutSec *>&1 | Tee-Object -FilePath $smokeLog
$smokeCode = $LASTEXITCODE

$finishedAt = Get-Date
$durationSec = [int](($finishedAt - $startedAt).TotalSeconds)

$result = [ordered]@{
  suite = 'graduation-backend-suite'
  generatedAt = $finishedAt.ToString('s')
  apiBase = $ApiBase
  durationSeconds = $durationSec
  checks = [ordered]@{
    backendTests = [ordered]@{
      passed = ($testExit -eq 0)
      exitCode = $testExit
      logFile = $testLog
      surefire = $surefireSummary
    }
    apiSmoke = [ordered]@{
      passed = ($smokeCode -eq 0)
      exitCode = $smokeCode
      logFile = $smokeLog
    }
  }
  overallPassed = (($testExit -eq 0) -and ($smokeCode -eq 0))
}

$result | ConvertTo-Json -Depth 8 | Set-Content -Path $jsonOut -Encoding UTF8

$md = @()
$md += '# Graduation Backend Suite Report'
$md += ''
$md += ('- Generated At: ' + $result.generatedAt)
$md += ('- API Base: ' + $result.apiBase)
$md += ('- Duration: ' + $result.durationSeconds + 's')
$md += ('- Overall: ' + ($(if ($result.overallPassed) { 'PASS' } else { 'FAIL' })))
$md += ''
$md += '## Backend Tests'
$md += ('- Passed: ' + $result.checks.backendTests.passed)
$md += ('- Exit Code: ' + $result.checks.backendTests.exitCode)
$md += ('- Test Suites: ' + $result.checks.backendTests.surefire.testSuites)
$md += ('- Tests: ' + $result.checks.backendTests.surefire.tests)
$md += ('- Failures: ' + $result.checks.backendTests.surefire.failures)
$md += ('- Errors: ' + $result.checks.backendTests.surefire.errors)
$md += ('- Skipped: ' + $result.checks.backendTests.surefire.skipped)
$md += ('- Time Seconds: ' + [Math]::Round([double]$result.checks.backendTests.surefire.timeSeconds, 3))
$md += ('- Log: ' + $result.checks.backendTests.logFile)
$md += ''
$md += '## API Smoke'
$md += ('- Passed: ' + $result.checks.apiSmoke.passed)
$md += ('- Exit Code: ' + $result.checks.apiSmoke.exitCode)
$md += ('- Log: ' + $result.checks.apiSmoke.logFile)
$md += ''
$md += '## Artifacts'
$md += ('- JSON: ' + $jsonOut)
$md += ('- Markdown: ' + $mdOut)

$md -join "`r`n" | Set-Content -Path $mdOut -Encoding UTF8

Write-Host '[3/3] Report generated:'
Write-Host ('- ' + $jsonOut)
Write-Host ('- ' + $mdOut)

if ($result.overallPassed) {
  Write-Host 'GRADUATION_SUITE_PASS'
  exit 0
}

Write-Error 'GRADUATION_SUITE_FAIL'
exit 1
