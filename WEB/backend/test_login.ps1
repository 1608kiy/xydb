param(
    $email = 'test@test.com',
    $password = '123456'
)
function TryLogin($url){
    try{
        $body = @{email=$email; password=$password} | ConvertTo-Json
        $r = Invoke-RestMethod -Method Post -Uri $url -ContentType 'application/json' -Body $body -TimeoutSec 5
        Write-Output "$url -> OK"
        Write-Output "token: $($r.data.token)"
    } catch {
        Write-Output "$url -> FAIL: $($_.Exception.Message)"
    }
}
TryLogin 'http://localhost:8080/api/auth/login'
TryLogin 'http://localhost:8081/api/auth/login'
