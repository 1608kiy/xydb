Set-Location 'E:\computer science\ringnote\backend'
$t = Get-Content -Raw '.\login_token.txt'
try {
  $r = Invoke-WebRequest -Method Get -Uri 'http://localhost:8080/api/me' -Headers @{ Authorization = 'Bearer ' + $t } -UseBasicParsing -TimeoutSec 10
  Write-Output ('STATUS:' + $r.StatusCode)
  Write-Output 'HEADERS:'
  $r.Headers | ConvertTo-Json -Compress | Write-Output
  Write-Output 'BODY:'
  Write-Output $r.Content
} catch {
  if ($_.Exception.Response) {
    $resp = $_.Exception.Response
    Write-Output ('STATUS:' + $resp.StatusCode.Value__)
    $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
    Write-Output 'BODY:'
    Write-Output $sr.ReadToEnd()
  } else {
    Write-Output $_.Exception.Message
  }
}

Write-Output '--- NOW DAILY ---'
try {
  $r2 = Invoke-WebRequest -Method Get -Uri 'http://localhost:8080/api/reports/daily-trend' -Headers @{ Authorization = 'Bearer ' + $t } -UseBasicParsing -TimeoutSec 10
  Write-Output ('STATUS:' + $r2.StatusCode)
  Write-Output 'BODY:'
  Write-Output $r2.Content
} catch {
  if ($_.Exception.Response) {
    $resp = $_.Exception.Response
    Write-Output ('STATUS:' + $resp.StatusCode.Value__)
    $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
    Write-Output 'BODY:'
    Write-Output $sr.ReadToEnd()
  } else {
    Write-Output $_.Exception.Message
  }
}
Write-Output '--- NOW OVERVIEW ---'
try {
  $r3 = Invoke-WebRequest -Method Get -Uri 'http://localhost:8080/api/reports/overview' -Headers @{ Authorization = 'Bearer ' + $t } -UseBasicParsing -TimeoutSec 10
  Write-Output ('STATUS:' + $r3.StatusCode)
  Write-Output 'BODY:'
  Write-Output $r3.Content
} catch {
  if ($_.Exception.Response) {
    $resp = $_.Exception.Response
    Write-Output ('STATUS:' + $resp.StatusCode.Value__)
    $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
    Write-Output 'BODY:'
    Write-Output $sr.ReadToEnd()
  } else {
    Write-Output $_.Exception.Message
  }
}
