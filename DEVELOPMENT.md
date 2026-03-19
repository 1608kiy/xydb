# 项目开发说明

本文档概述如何在本地运行、调试和扩展本项目（后端：Spring Boot；前端：静态 HTML + 原生 JS）。

## 环境要求
- JDK 17+（项目使用 Java 24 也可兼容，确保本地 JDK 与构建工具兼容）
- Maven（推荐使用仓库内的 `mvnw`）
- MySQL 8（或兼容的数据库），已配置在 `backend/src/main/resources/application.properties` 中
- Windows / macOS / Linux 任一支持环境

## 快速启动（后端）
1. 进入后端目录：

```powershell
cd "E:\computer science\xydb\backend"
```

2. 使用 Maven Wrapper 打包并启动（跳过测试以加快）

```powershell
.\mvnw.cmd -DskipTests spring-boot:run
```

3. 若 8080 被占用，请先查找并终止占用进程：

```powershell
netstat -ano | findstr :8080
taskkill /PID <PID> /F
```

## 快速启动（前端）
- 前端为静态页面，直接在浏览器打开 `frontend/` 下 HTML 文件即可开发与调试。
- 推荐在登录后打开 `frontend/数据周报页面.html` 验证报表渲染。

## 主要后端接口（摘选）
- POST `/api/auth/login` — 登录，返回 JWT
- GET `/api/me` — 获取当前用户信息（需授权）
- GET `/api/reports/overview` — 概览（最近 7 天默认）
- GET `/api/reports/daily-trend` — 日趋势（days, taskCounts, focusMinutes, heatmap）
- 其他：任务、番茄、打卡相关接口请参考 `backend/src/main/java/com/xydb/backend/controller` 下文件

响应模型：统一使用 `Result<T>` 格式：{ code, message, data }

## 报表接口说明
- `overview` 返回字段示例：
  - `completedTasks`、`totalFocusMinutes`、`totalPomodoros`、`maxContinuousPomodoros`、`effectivenessScore`、`categoryStats`（数组）
- `daily-trend` 返回字段示例：
  - `days`（字符串数组）、`taskCounts`（每日完成任务数）、`focusMinutes`（每日专注分钟）、`heatmap`（[[slot, dayIndex, value], ...]）

## 调试脚本
- `backend/check_reports.ps1`：用现有 token 调用 `/api/me`、`/api/reports/overview`、`/api/reports/daily-trend`，便于端到端验证。
- 其它脚本：`restart_with_log.ps1`、`start_and_call.ps1`（若存在）可用于重定向日志并启动服务。

## 开发进度（2026-03-19，同步）
- 后端已在 `local` profile 下可本地启动，使用内存 H2 数据库（用于本地快速验收）。
- 已移除 local profile 中的自动注入测试用户逻辑，改为更安全的本地配置（`DevSecurityConfig` 使用 `permitAll()`），并为依赖注入添加了 `BCryptPasswordEncoder` bean。
- 修复/调整：`backend/src/main/java/com/xydb/backend/model/Task.java` 增强 Jackson 反序列化容错，解决 POST 400 问题。
- 前端：在 `frontend/待办页面.html` 中加入了对 `common.js` 的引入，修复了按钮因脚本错误无法响应的问题。
- 本地测试脚本（位于 `backend/target`，仅供本地调试）：
  - `register_dev.ps1`：注册本地测试账户并返回 token。
  - `login.ps1`：登录（获取 token）。
  - `create_task.ps1`：使用 token 创建测试任务。
 另外新增辅助脚本：`backend/scripts/stop_java.ps1`（停止本机 java 进程，释放被占用的 jar）。
- 已在本地完成一次注册与任务创建验证：
  - 注册响应包含 token（示例 token 已用于后续测试）。
  - 使用该 token 成功创建了一个测试任务，响应示例包含 `id`、`title`、`status`、`priority`、`user` 等字段。

重现实验的 PowerShell 命令示例（可直接在项目根或 `backend` 目录运行）：

```powershell
# 注册（返回 token）
$body = '{"nickname":"test","email":"dev@test.com","password":"123456"}'
Invoke-RestMethod -Uri 'http://localhost:8080/api/auth/register' -Method Post -ContentType 'application/json' -Body $body

# 登录
$body = '{"email":"dev@test.com","password":"123456"}'
Invoke-RestMethod -Uri 'http://localhost:8080/api/auth/login' -Method Post -ContentType 'application/json' -Body $body

# 使用 token 创建任务（将 <TOKEN> 替换为上一步返回的 token）
$token = '<TOKEN>'
$task = '{"title":"测试任务","priority":"medium","status":"pending"}'
Invoke-RestMethod -Uri 'http://localhost:8080/api/tasks' -Method Post -ContentType 'application/json' -Headers @{ Authorization = "Bearer $token" } -Body $task
```

已把本次改动提交并推送到远程分支（commit 信息："chore: 本地开发调整：DevSecurityConfig、为待办页引入 common.js、添加本地测试脚本"，已 push 到 `origin/main`）。

如需我把测试脚本移到 `backend/scripts` 下并移除 `target` 中的临时文件以保持仓库整洁，我可以把脚本迁移并提交一条新的 commit。

## 常见问题与排查
- 403 问题常见原因：JWT 未携带或 `/error` 路径被安全链保护导致的间接 403。
- Jackson 序列化异常会导致请求跳转到 `/error` 并被安全拦截，请确保 Controller 返回可序列化结构（Map/DTO/POJO），不要直接返回 `new Object()`。

## 本地数据库与数据迁移
- 请查看 `backend/pom.xml` 与 `application.properties` 获取数据库配置；开发时可以使用 `spring.jpa.hibernate.ddl-auto=update`。谨慎在生产使用。

## 开发约定
- Controller 返回 `ResponseEntity<Result<?>>`。
- 安全：使用 JWT，前端需在 `Authorization: Bearer <token>` 中携带。

## 每日汇报流程（最小化）
1. 使用 `backend/check_reports.ps1` 验证报表接口是否可达并截图/保存输出。
2. 在每日汇报文档（`REPORTS/DAILY_REPORT_TEMPLATE.md`）中填写今天工作简报并提交到项目跟进记录。

---
如需补充 CI、测试或代码风格规范，请告诉我我会一并加入。

## 后续规划（按优先级）
下面为分阶段的后续开发计划，按优先级排序，便于每日跟踪与拆分任务。

### 第一阶段：完善核心功能（明天）
1. 个人中心页面对接后端（用户信息修改）
2. 日历页面对接任务接口（创建/编辑/显示任务在日历上）
3. 报表聚合逻辑优化（用真实数据替换占位，按任务与时间段精确统计）

### 第二阶段：数据完整性
1. 子任务批量更新接口（支持前端一次性更新多个子任务状态/内容）
2. 标签管理接口对接前端（增删改查标签并用于任务过滤）
3. 打卡日历数据真实化（将打卡数据与日历视图绑定并支持历史查询）

### 第三阶段：部署上线
1. 打包为可运行的 JAR（生产配置、profiles）
2. 上传到阿里云服务器并配置运行环境（JRE、数据库连接）
3. 配置 Nginx 反向代理（前端静态与后端 API 反代与 TLS）
4. 前端静态文件部署（将 `frontend` 构建/放到静态宿主或 CDN）

### 第四阶段：收尾
1. 接口参数校验完善（使用 DTO 与校验注解）
2. 错误处理优化（统一异常处理、友好错误消息）
3. 基础功能测试（单元 + 集成测试，覆盖报表/认证/重要业务流）

每项完成后请在 `REPORTS/` 下提交当日进度文件以便追踪。
