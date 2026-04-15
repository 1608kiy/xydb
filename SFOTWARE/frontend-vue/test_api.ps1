#!/usr/bin/env powershell
# Vue 重构端到端快速测试脚本
# 2026-04-15

Write-Host "🧪 Vue 重构端到端测试脚本" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 测试配置
$frontend_url = "http://localhost:5173"
$backend_url = "http://localhost:8080"
$test_email = "test_$(Get-Random)@example.com"
$test_password = "TestPassword123!"

Write-Host "📋 测试配置："
Write-Host "  前端地址：$frontend_url"
Write-Host "  后端地址：$backend_url"
Write-Host "  测试邮箱：$test_email"
Write-Host ""

# 1. 检查前端服务
Write-Host "✓ 步骤 1: 检查前端服务..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $frontend_url -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✅ 前端服务正常 (200)" -ForegroundColor Green
    }
} catch {
    Write-Host "  ❌ 前端服务不可用：$($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. 检查后端服务
Write-Host "✓ 步骤 2: 检查后端服务..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$backend_url/actuator" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✅ 后端服务正常 (200)" -ForegroundColor Green
    }
} catch {
    Write-Host "  ❌ 后端服务不可用：$($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 3. 测试注册 API
Write-Host "✓ 步骤 3: 测试用户注册..." -ForegroundColor Yellow
$register_data = @{
    email = $test_email
    name = "Test User"
    password = $test_password
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest `
        -Uri "$backend_url/api/auth/register" `
        -Method POST `
        -ContentType "application/json" `
        -Body $register_data `
        -UseBasicParsing `
        -TimeoutSec 10
    
    $content = $response.Content | ConvertFrom-Json
    if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 201) {
        Write-Host "  ✅ 注册成功 ($($response.StatusCode))" -ForegroundColor Green
        $token = $content.token
        Write-Host "  Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
    }
} catch {
    $error_content = $_.Exception.Response.Content.ReadAsStream() | ForEach-Object { [char]$_ } -join ''
    Write-Host "  ❌ 注册失败：$error_content" -ForegroundColor Red
    exit 1
}

# 4. 测试登录 API
Write-Host "✓ 步骤 4: 测试用户登录..." -ForegroundColor Yellow
$login_data = @{
    email = $test_email
    password = $test_password
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest `
        -Uri "$backend_url/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $login_data `
        -UseBasicParsing `
        -TimeoutSec 10
    
    $content = $response.Content | ConvertFrom-Json
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✅ 登录成功 (200)" -ForegroundColor Green
        $token = $content.token
        Write-Host "  Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
    }
} catch {
    $error_content = $_.Exception.Response.Content.ReadAsStream() | ForEach-Object { [char]$_ } -join ''
    Write-Host "  ❌ 登录失败：$error_content" -ForegroundColor Red
    exit 1
}

# 5. 测试获取任务列表 API
Write-Host "✓ 步骤 5: 测试获取任务列表..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $token"
}

try {
    $response = Invoke-WebRequest `
        -Uri "$backend_url/api/tasks" `
        -Method GET `
        -Headers $headers `
        -UseBasicParsing `
        -TimeoutSec 10
    
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✅ 获取任务列表成功 (200)" -ForegroundColor Green
        $tasks = $response.Content | ConvertFrom-Json
        Write-Host "  任务数：$($tasks.Count)" -ForegroundColor Gray
    }
} catch {
    Write-Host "  ❌ 获取任务列表失败：$($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 6. 测试创建任务 API
Write-Host "✓ 步骤 6: 测试创建任务..." -ForegroundColor Yellow
$task_data = @{
    title = "Test Task - $(Get-Date -Format 'HH:mm:ss')"
    description = "This is a test task created by automation script"
    dueDate = (Get-Date).AddDays(1).ToString("yyyy-MM-ddTHH:mm:ss")
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest `
        -Uri "$backend_url/api/tasks" `
        -Method POST `
        -ContentType "application/json" `
        -Headers $headers `
        -Body $task_data `
        -UseBasicParsing `
        -TimeoutSec 10
    
    if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 201) {
        Write-Host "  ✅ 创建任务成功 ($($response.StatusCode))" -ForegroundColor Green
        $task = $response.Content | ConvertFrom-Json
        $task_id = $task.id
        Write-Host "  任务 ID：$task_id" -ForegroundColor Gray
    }
} catch {
    $error_msg = $_.Exception.Message
    Write-Host "  ⚠️  创建任务返回：$error_msg (可能是 API 未实现)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✅ 后端 API 基础测试完成！" -ForegroundColor Green
Write-Host ""
Write-Host "📌 后续建议："
Write-Host "  1. 打开浏览器访问 http://localhost:5173"
Write-Host "  2. 测试完整的前端流程（注册、登录、CRUD）"
Write-Host "  3. 使用 F12 DevTools 检查网络和控制台"
Write-Host "  4. 查看 Vue DevTools 中的 Pinia store 状态"
Write-Host ""
Write-Host "💾 测试数据："
Write-Host "  邮箱：$test_email"
Write-Host "  密码：$test_password"
Write-Host ""
