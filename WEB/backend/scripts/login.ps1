$body = '{"email":"test@test.com","password":"123456"}'
try {
    $resp = Invoke-RestMethod -Uri 'http://localhost:8080/api/auth/login' -Method Post -ContentType 'application/json' -Body $body
    $resp | ConvertTo-Json
} catch {
    Write-Output "ERROR: $($_.Exception.Message)"
    if ($_.Exception.Response) { $_.Exception.Response.GetResponseStream() | Select-Object -First 1 | ForEach-Object { $_ } }
}
