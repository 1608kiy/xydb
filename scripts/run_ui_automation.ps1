<#
UI 自动化巡检脚本（供本地开发使用）
执行内容：scripts/e2e/ui_automation_smoke.cjs
#>

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$node = Join-Path $root 'tools\node\node.exe'
$npm = Join-Path $root 'tools\node\npm.cmd'
$npx = Join-Path $root 'tools\node\npx.cmd'
$e2eDir = Join-Path $root 'scripts\e2e'
$scriptPath = Join-Path $e2eDir 'ui_automation_smoke.cjs'

if (-not (Test-Path $node)) { throw "找不到 node.exe: $node" }
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
  if ($LASTEXITCODE -ne 0) { throw "UI 自动化巡检失败，exit=$LASTEXITCODE" }
}
finally {
  Pop-Location
}

Write-Host 'UI 自动化巡检完成'

