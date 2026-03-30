$body = '{"date":"' + (Get-Date).ToString('yyyy-MM-dd') + '","time":"' + (Get-Date).ToString('HH:mm') + '","type":"study","note":"local fallback test"}'
try {
  $r = Invoke-RestMethod -Uri 'http://localhost:8080/api/checkins' -Method Post -ContentType 'application/json' -Body $body
  $r | ConvertTo-Json
} catch {
  Write-Output ('ERROR: ' + $_.Exception.Message)
  if ($_.Exception.Response) {
    $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $str = $sr.ReadToEnd()
    Write-Output $str
  }
}