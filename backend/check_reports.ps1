Set-Location 'E:\computer science\xydb\backend'
$token = (Get-Content .\login_token.txt -Raw).Trim()
Write-Output '-----TOKEN-----'
Write-Output $token
$headers = @{ Authorization = "Bearer $token" }
$urls = @('http://localhost:8080/api/me','http://localhost:8080/api/reports/overview','http://localhost:8080/api/reports/daily-trend')
foreach($u in $urls) {
  Write-Output '-----'
  Write-Output "URL: $u"
  try {
    $r = Invoke-RestMethod -Uri $u -Headers $headers -Method Get -ErrorAction Stop
    Write-Output 'STATUS: 200'
    Write-Output 'BODY:'
    $r | ConvertTo-Json -Depth 6
  } catch {
    if ($_.Exception.Response) {
      $resp = $_.Exception.Response
      $status = $resp.StatusCode.value__
      $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
      $body = $sr.ReadToEnd()
      Write-Output "STATUS: $status"
      Write-Output 'BODY:'
      Write-Output $body
    } else {
      Write-Output "ERROR: $($_.Exception.Message)"
    }
  }
}
