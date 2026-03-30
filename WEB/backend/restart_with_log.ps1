Set-Location 'E:\computer science\ringnote\backend'
$out = Join-Path (Get-Location) 'backend_run.log'
$err = Join-Path (Get-Location) 'backend_run.err'
if (Test-Path $out) { Remove-Item $out -Force }
if (Test-Path $err) { Remove-Item $err -Force }
# Start backend and redirect output
$proc = Start-Process -FilePath '.\mvnw.cmd' -ArgumentList 'spring-boot:run' -WorkingDirectory (Get-Location) -RedirectStandardOutput $out -RedirectStandardError $err -PassThru
Write-Output ('Started process Id=' + $proc.Id)
# wait for server startup message
$tries = 0
while ($tries -lt 60) {
  if (Test-Path $out) {
    $tail = Get-Content $out -Tail 50 -ErrorAction SilentlyContinue
    if ($tail -match 'Tomcat started on port 8080|Started BackendApplication') {
      Write-Output 'SERVER_STARTED'
      break
    }
  }
  Start-Sleep -Seconds 1
  $tries = $tries + 1
}
if ($tries -ge 60) { Write-Output 'START_TIMEOUT' } else { Write-Output 'OK' }
Write-Output ('Log file: ' + $out)
