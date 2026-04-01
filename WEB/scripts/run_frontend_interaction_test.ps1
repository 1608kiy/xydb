<#
前端交互测试脚本（供本地开发使用）
执行内容：scripts/e2e/frontend_interaction_flow.cjs
#>

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$localNode = Join-Path $root 'tools\node\node.exe'
$localNpm = Join-Path $root 'tools\node\npm.cmd'
$localNpx = Join-Path $root 'tools\node\npx.cmd'

$node = if (Test-Path $localNode) { $localNode } else { (Get-Command node -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -First 1) }
$npm = if (Test-Path $localNpm) { $localNpm } else { (Get-Command npm -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -First 1) }
$npx = if (Test-Path $localNpx) { $localNpx } else { (Get-Command npx -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -First 1) }
$e2eDir = Join-Path $root 'scripts\e2e'
$scriptPath = Join-Path $e2eDir 'frontend_interaction_flow.cjs'

if (-not (Test-Path $node)) { throw "找不到 node.exe: $node" }
if (-not $npm) { throw '找不到 npm，请先安装 Node.js 或补齐 tools/node' }
if (-not $npx) { throw '找不到 npx，请先安装 Node.js 或补齐 tools/node' }
if (-not (Test-Path $scriptPath)) { throw "找不到脚本: $scriptPath" }

Push-Location $e2eDir
try {
  if (-not (Test-Path (Join-Path $e2eDir 'node_modules\playwright'))) {
    Write-Host 'playwright 未安装，正在安装依赖...'
    & $npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install 失败，exit=$LASTEXITCODE" }
    & $npx playwright install chromium
    if ($LASTEXITCODE -ne 0) { throw "playwright install 失败，exit=$LASTEXITCODE" }
  }
  & $node $scriptPath
  if ($LASTEXITCODE -ne 0) { throw "前端交互测试失败，exit=$LASTEXITCODE" }
}
finally {
  Pop-Location
}

Write-Host '前端交互测试完成'

