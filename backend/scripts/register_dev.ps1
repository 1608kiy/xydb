$body = '{"nickname":"test","email":"dev@test.com","password":"123456"}'
try {
    $resp = Invoke-RestMethod -Uri 'http://localhost:8080/api/auth/register' -Method Post -ContentType 'application/json' -Body $body
    $resp | ConvertTo-Json
} catch {
    Write-Output "ERROR: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $str = $sr.ReadToEnd()
        Write-Output $str
    }
}
