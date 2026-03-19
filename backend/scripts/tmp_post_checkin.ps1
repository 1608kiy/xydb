$loginBody = '{"email":"dev@test.com","password":"123456"}'
try {
  $login = Invoke-RestMethod -Uri 'http://localhost:8080/api/auth/login' -Method Post -ContentType 'application/json' -Body $loginBody
  $token = $login.data.token
  Write-Output ('TOKEN:' + $token)
  $hdr = @{ Authorization = 'Bearer ' + $token }
  $body = '{"date":"' + (Get-Date).ToString('yyyy-MM-dd') + '","time":"' + (Get-Date).ToString('HH:mm') + '","type":"学习","note":"自动化测试打卡"}'
  $r = Invoke-RestMethod -Uri 'http://localhost:8080/api/checkins' -Method Post -ContentType 'application/json' -Body $body -Headers $hdr
  $r | ConvertTo-Json
} catch {
  Write-Output ('ERROR: ' + $_.Exception.Message)
  if ($_.Exception.Response) {
    $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $str = $sr.ReadToEnd()
    Write-Output $str
  }
}