<#
PowerShell 验证脚本：检查 /api/me（若未登录则尝试登录），然后向 /api/tasks 创建一个测试任务。
用法示例：
  powershell -ExecutionPolicy Bypass -File .\scripts\verify_api.ps1 -ApiBase 'http://localhost:8082' -User 'test@test.com' -Pass '123456'
参数：
  -ApiBase : 后端基址，默认 http://localhost:8082
  -User    : 登录用户（可选）
  -Pass    : 登录密码（可选，若提供则会尝试登录获取 token）

退出码：0 = 成功创建任务或已验证；非0 = 失败
#>

param(
  [string]$ApiBase = 'http://localhost:8082',
  [string]$User = '',
  [string]$Pass = ''
)

function Invoke-Api {
  param(
    [string]$Method = 'GET',
    [string]$Path,
    $Body = $null,
    [string]$Token = ''
  )
  $url = if ($Path.StartsWith('http')) { $Path } else { ($ApiBase.TrimEnd('/') + '/' + $Path.TrimStart('/')) }
  try {
    $headers = @{}
    if ($Token) { $headers['Authorization'] = "Bearer $Token" }
    if ($Body -ne $null) {
      $json = if ($Body -is [string]) { $Body } else { $Body | ConvertTo-Json -Depth 5 }
      $resp = Invoke-RestMethod -Uri $url -Method $Method -Headers $headers -ContentType 'application/json' -Body $json -ErrorAction Stop
    } else {
      $resp = Invoke-RestMethod -Uri $url -Method $Method -Headers $headers -ErrorAction Stop
    }
    return @{ success = $true; data = $resp }
  } catch {
    return @{ success = $false; error = $_.Exception; raw = $_.Exception.Response }
  }
}

Write-Host "[1/4] Checking API base: $ApiBase"

# 1) 先尝试 /api/me
$me = Invoke-Api -Method 'GET' -Path '/api/me'
if ($me.success) {
  Write-Host "/api/me returned success:"
  $me.data | ConvertTo-Json -Depth 5 | Write-Host
  Write-Host "Authenticated user, skipping login."
  $token = ''
  # Some backends do not return a token here; we only verify reachability
} else {
  Write-Warning "/api/me inaccessible or not authenticated."
  if (-not [string]::IsNullOrWhiteSpace($User) -and -not [string]::IsNullOrWhiteSpace($Pass)) {
    Write-Host "[2/4] Attempting login with provided credentials: $User"
    $loginPayload = @{ email = $User; password = $Pass }
    $login = Invoke-Api -Method 'POST' -Path '/api/auth/login' -Body $loginPayload
    if ($login.success) {
      Write-Host "Login returned:"
      $login.data | ConvertTo-Json -Depth 5 | Write-Host
      # parse token
      $token = $null
      try { $token = $login.data.data.token } catch { $token = $null }
      if (-not $token) {
        Write-Warning "Login succeeded but no token returned; check response format."
        $token = ''
      } else {
        Write-Host "Obtained token length: $($token.Length)"
      }
    } else {
      Write-Error "Login failed: $($login.error.Message)"
      exit 2
    }
  } else {
    Write-Warning "No username/password provided; attempting to auto-register a test user..."
    $rand = Get-Random -Maximum 100000
    $testEmail = "verify-$rand-$(Get-Date -Format yyyyMMddHHmmss)@example.test"
    $testPass = "VerifyPass123!"
    $testNick = "verify-$rand"
    $regPayload = @{ nickname = $testNick; email = $testEmail; password = $testPass }
    Write-Host "Attempting register with $testEmail / $testPass"
    $reg = Invoke-Api -Method 'POST' -Path '/api/auth/register' -Body $regPayload
    if ($reg.success) {
      Write-Host "Register returned:"; $reg.data | ConvertTo-Json -Depth 5 | Write-Host
      # Try to login to get token
      $loginPayload = @{ email = $testEmail; password = $testPass }
      $login = Invoke-Api -Method 'POST' -Path '/api/auth/login' -Body $loginPayload
      if ($login.success) {
        Write-Host "Login returned:"; $login.data | ConvertTo-Json -Depth 5 | Write-Host
        try { $token = $login.data.data.token } catch { $token = '' }
        if (-not $token) { Write-Warning "Auto-login succeeded but no token found."; $token = '' }
      } else {
        Write-Warning "Auto-login failed after register: $($login.error.Message)"
        $token = ''
      }
    } else {
      Write-Warning "Auto-register failed; skipping login (no token)."
      $token = ''
    }
  }
}

# 3) 创建测试任务
if ($token) {
  $meAuth = Invoke-Api -Method 'GET' -Path '/api/me' -Token $token
  if ($meAuth.success) {
    Write-Host "Authenticated /api/me returned:"; $meAuth.data | ConvertTo-Json -Depth 5 | Write-Host
  } else {
    Write-Warning "Provided token did not authenticate against /api/me. Will still attempt task creation to capture server response."
    if ($meAuth.raw) {
      try { $sr = New-Object System.IO.StreamReader($meAuth.raw.GetResponseStream()); $bodyText = $sr.ReadToEnd(); $sr.Close(); Write-Host "Auth response body: $bodyText" } catch {}
    }
  }
}
Write-Host "[3/4] Attempting to create test task (with token)..."
$taskPayload = @{
  title = "verify-api-test-$(Get-Date -Format o)"
  description = "created-by-verify_api.ps1"
  priority = 'medium'
  tags = '["work"]'
  status = 'pending'
  dueAt = (Get-Date).ToString('yyyy-MM-dd') + 'T12:00:00'
}

$create = Invoke-Api -Method 'POST' -Path '/api/tasks' -Body $taskPayload -Token $token
if ($create.success) {
  Write-Host "Create task success, response:"
  $create.data | ConvertTo-Json -Depth 5 | Write-Host
  Write-Host "Verification passed: backend reachable and created task."
  exit 0
} else {
  Write-Error "Create task failed:"
  if ($create.raw) {
    try {
      $sr = New-Object System.IO.StreamReader($create.raw.GetResponseStream())
      $bodyText = $sr.ReadToEnd(); $sr.Close();
      Write-Host "Response body: $bodyText"
    } catch {}
  }
  if ($create.error) { Write-Host $create.error.ToString() }
  exit 3
}
