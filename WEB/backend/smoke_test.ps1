# Smoke test script for backend
$max=60
for($i=0;$i -lt $max;$i++){
  if((Test-NetConnection -ComputerName 'localhost' -Port 8081).TcpTestSucceeded){
    Write-Output 'READY'
    break
  }
  Start-Sleep -Seconds 1
}
if(-not (Test-NetConnection -ComputerName 'localhost' -Port 8081).TcpTestSucceeded){
  Write-Output 'SERVER_NOT_READY'
  exit 1
}
# register
try {
  Invoke-RestMethod -Method Post -Uri 'http://localhost:8081/api/auth/register' -ContentType 'application/json' -Body (@{nickname='smoketest';email='smoketest@example.com';password='P@ssw0rd'} | ConvertTo-Json)
  Write-Output 'REGISTER_OK'
} catch {
  Write-Output ('REGISTER_FAILED: ' + $_.Exception.Message)
}
# login
try {
  $login = Invoke-RestMethod -Method Post -Uri 'http://localhost:8081/api/auth/login' -ContentType 'application/json' -Body (@{email='smoketest@example.com';password='P@ssw0rd'} | ConvertTo-Json)
  $token = $login.data.token
  Write-Output ('TOKEN:' + $token)
} catch {
  Write-Output ('LOGIN_FAILED: ' + $_.Exception.Message)
  exit 1
}
# create task
try {
  $headers = @{ Authorization = "Bearer $token" }
  $task = Invoke-RestMethod -Method Post -Uri 'http://localhost:8081/api/tasks' -ContentType 'application/json' -Headers $headers -Body (@{title='Smoke Task'; description='Created by smoke test'} | ConvertTo-Json)
  Write-Output ('TASK_CREATED: ' + ($task.data.id -as [string]))
} catch {
  Write-Output ('TASK_CREATE_FAILED: ' + $_.Exception.Message)
}
