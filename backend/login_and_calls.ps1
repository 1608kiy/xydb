Set-Location 'E:\computer science\xydb\backend'
$body = Get-Content -Raw '.\login_temp.json'
try {
  $login = Invoke-RestMethod -Method Post -Uri 'http://localhost:8080/api/auth/login' -Body $body -ContentType 'application/json' -TimeoutSec 10
  if ($login.token) { $t=$login.token }
  elseif ($login.data -and $login.data.token) { $t=$login.data.token }
  elseif ($login.data -and $login.data.accessToken) { $t=$login.data.accessToken }
  else { $t=$null }
  if ($t) {
    Set-Content -Path '.\login_token.txt' -Value $t -Encoding UTF8
    Write-Output 'TOKEN_SAVED'
    Write-Output $t
    try {
      $overview = Invoke-RestMethod -Method Get -Uri 'http://localhost:8080/api/reports/overview' -Headers @{ Authorization = 'Bearer ' + $t } -TimeoutSec 10
      $overview | ConvertTo-Json -Compress | Set-Content '.\overview.json'
      Write-Output 'OVERVIEW_OK'
      Get-Content '.\overview.json' -Raw | Write-Output
    } catch {
      Write-Output 'OVERVIEW_ERROR'
      if ($_.Exception.Response) {
        $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Output $sr.ReadToEnd()
      } else {
        Write-Output $_.Exception.Message
      }
    }
    try {
      $daily = Invoke-RestMethod -Method Get -Uri 'http://localhost:8080/api/reports/daily-trend' -Headers @{ Authorization = 'Bearer ' + $t } -TimeoutSec 10
      $daily | ConvertTo-Json -Compress | Set-Content '.\daily.json'
      Write-Output 'DAILY_OK'
      Get-Content '.\daily.json' -Raw | Write-Output
    } catch {
      Write-Output 'DAILY_ERROR'
      if ($_.Exception.Response) {
        $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Output $sr.ReadToEnd()
      } else {
        Write-Output $_.Exception.Message
      }
    }
  } else {
    Write-Output 'NO_TOKEN'
    $login | ConvertTo-Json -Compress | Write-Output
  }
} catch {
  Write-Output 'LOGIN_EXCEPTION'
  if ($_.Exception.Response) {
    $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    Write-Output $sr.ReadToEnd()
  } else {
    Write-Output $_.Exception.Message
  }
}
