<#
PowerShell 验证脚本：检查 /api/me（若未登录则尝试登录），然后向 /api/tasks 创建一个测试任务。
用法示例：
  powershell -ExecutionPolicy Bypass -File .\scripts\verify_api.ps1 -ApiBase 'http://localhost:8080' -User 'test@test.com' -Pass '123456'
参数：
  -ApiBase : 后端基址，默认 http://localhost:8080
  -User    : 登录用户（可选）
  -Pass    : 登录密码（可选，若提供则会尝试登录获取 token）

退出码：0 = 成功创建任务或已验证；非0 = 失败
#>

param(
  [string]$ApiBase = 'http://localhost:8080',
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

Write-Host "[1/4] 检查 API 基址: $ApiBase"

# 1) 先尝试 /api/me
$me = Invoke-Api -Method 'GET' -Path '/api/me'
if ($me.success) {
  Write-Host "/api/me 返回成功："
  $me.data | ConvertTo-Json -Depth 5 | Write-Host
  Write-Host "已认证用户，跳过登录。"
  $token = ''
  # 有些后端未返回 token，这里只验证接口可达
} else {
  Write-Warning "/api/me 无法直接访问或未认证。"
  if (-not [string]::IsNullOrWhiteSpace($User) -and -not [string]::IsNullOrWhiteSpace($Pass)) {
    Write-Host "[2/4] 尝试使用提供的凭证登录：$User"
    $loginPayload = @{ email = $User; password = $Pass }
    $login = Invoke-Api -Method 'POST' -Path '/api/auth/login' -Body $loginPayload
    if ($login.success) {
      Write-Host "登录返回："
      $login.data | ConvertTo-Json -Depth 5 | Write-Host
      # 解析 token
      $token = $null
      try { $token = $login.data.data.token } catch { $token = $null }
      if (-not $token) {
        Write-Warning "登录成功但未返回 token（字段位置不一致）。请检查返回格式。"
        $token = ''
      } else {
        Write-Host "已获取 token 长度: $($token.Length)"
      }
    } else {
      Write-Error "登录失败： $($login.error.Message)"
      exit 2
    }
  } else {
    Write-Warning "未提供用户名/密码，跳过登录步骤（无法获取 token）。"
    $token = ''
  }
}

# 3) 创建测试任务
Write-Host "[3/4] 尝试创建测试任务（带 token）..."
$taskPayload = @{
  title = "自动化测试任务 $(Get-Date -Format o)"
  description = "由 verify_api.ps1 自动创建，用于验证创建接口"
  priority = 'medium'
  tags = '["工作"]'
  status = 'pending'
  dueAt = (Get-Date).ToString('yyyy-MM-dd') + 'T12:00:00'
}

$create = Invoke-Api -Method 'POST' -Path '/api/tasks' -Body $taskPayload -Token $token
if ($create.success) {
  Write-Host "创建任务成功，返回："
  $create.data | ConvertTo-Json -Depth 5 | Write-Host
  Write-Host "验证通过：后端可达且可创建任务。"
  exit 0
} else {
  Write-Error "创建任务失败："
  if ($create.raw) {
    try {
      $sr = New-Object System.IO.StreamReader($create.raw.GetResponseStream())
      $bodyText = $sr.ReadToEnd(); $sr.Close();
      Write-Host "响应体: $bodyText"
    } catch {}
  }
  if ($create.error) { Write-Host $create.error.ToString() }
  exit 3
}
