$loginBody = '{"email":"dev@test.com","password":"123456"}'
try {
  $login = Invoke-RestMethod -Uri 'http://localhost:8080/api/auth/login' -Method Post -ContentType 'application/json' -Body $loginBody
  $token = $login.data.token
  Write-Output ('TOKEN:' + $token)
  $hdr = @{ Authorization = 'Bearer ' + $token }
  $r = Invoke-RestMethod -Uri 'http://localhost:8080/api/me' -Method Get -Headers $hdr
  $r | ConvertTo-Json
} catch {
  Write-Output ('ERROR: ' + $_.Exception.Message)
  if ($_.Exception.Response) {
    $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $str = $sr.ReadToEnd()
    Write-Output $str
  }
}