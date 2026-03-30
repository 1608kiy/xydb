$body = @{ 
    nickname = 'dev'
    email = 'test@test.com'
    password = 'password'
}
$json = $body | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:8080/api/auth/register' -Method Post -ContentType 'application/json' -Body $json | ConvertTo-Json
