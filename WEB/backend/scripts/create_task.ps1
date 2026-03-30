$token = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJkZXZAdGVzdC5jb20iLCJpYXQiOjE3NzM4OTEyOTgsImV4cCI6MTc3NDQ5NjA5OH0.MKbDYAOIgVM2cHcp8gvZBw6Wtd7OIZ5hDYw3conVK_0'
$body = '{"title":"测试任务","priority":"medium","status":"pending"}'
try {
    $resp = Invoke-RestMethod -Uri 'http://localhost:8080/api/tasks' -Method Post -ContentType 'application/json' -Headers @{ Authorization = "Bearer $token" } -Body $body
    $resp | ConvertTo-Json
} catch {
    Write-Output "ERROR: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $str = $sr.ReadToEnd()
        Write-Output $str
    }
}
