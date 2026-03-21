# 前端 E2E 脚本（本地）

本目录提供两份给开发阶段使用的脚本：

- `ui_automation_smoke.cjs`
  - 多页面 UI 自动化巡检（加载、关键文本、截图）
- `frontend_interaction_flow.cjs`
  - 前端关键交互链路（待办创建+子任务、日历详情交互）

## 运行方式

### 方式一：PowerShell 启动器（推荐）

在仓库根目录执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run_ui_automation.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\run_frontend_interaction_test.ps1
```

### 方式二：直接运行 Node 脚本

```powershell
cd .\scripts\e2e
..\..\tools\node\npm.cmd install
..\..\tools\node\npx.cmd playwright install chromium
..\..\tools\node\node.exe .\ui_automation_smoke.cjs
..\..\tools\node\node.exe .\frontend_interaction_flow.cjs
```

## 报告输出

脚本会将报告与截图输出到：

- `REPORTS/e2e/ui_smoke_时间戳/`
- `REPORTS/e2e/interaction_时间戳/`

