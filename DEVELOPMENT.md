# 项目开发文档（更新于 2026-03-22）

本文档用于快速上手本仓库开发、联调和交付。

## 1. 项目概览
- 前端：多页面静态站点（HTML + Tailwind CDN + 原生 JS）
- 后端：Spring Boot（JWT 鉴权，统一 `Result<T>` 返回）
- 目录：
  - `frontend/`：业务页面与前端脚本
  - `backend/`：Java 服务与接口
  - `scripts/`：回归与接口验证脚本
  - `REPORTS/`：日报与进度记录

## 2. 本地环境
- JDK 17+
- Maven（推荐仓库内 Wrapper）
- MySQL 8（生产/默认配置）
- Windows PowerShell（仓库内脚本默认使用）

## 3. 启动方式

### 3.1 后端（推荐 local 配置）

`local` 使用 H2 内存库，最适合联调：

```powershell
cd "E:\computer science\ringnote\backend"
cmd.exe /c ".\mvnw.cmd -Dspring-boot.run.profiles=local spring-boot:run"
```

探活：

```powershell
Invoke-WebRequest -Uri "http://localhost:8080/actuator/health" -UseBasicParsing
```

### 3.2 前端
- 可直接打开 `frontend/*.html`。
- 若使用静态服务，请确保 `/api` 能代理到后端，或在页面设置 `window.__API_BASE__` / localStorage `apiBase`。

## 4. 当前关键能力（本轮完善）

### 4.1 待办页离线与同步
- 创建任务失败时自动降级为本地离线创建。
- 离线任务进入待同步队列，网络恢复后自动同步到后端。
- 提供同步状态徽标：`待同步` / `同步中` / `已同步`。

### 4.2 待办页排序
- 已支持：按时间、按优先级、按标签、按完成状态。
- 排序菜单支持选中态，高亮当前排序策略。

### 4.3 侧边栏筛选
- 主分类 5 项可点击：所有任务、我的一天、重要任务、已计划、已分配给我。
- 标签可点击筛选同类任务，再次点击可取消。
- 主分类与标签筛选交互做了互斥优化，避免“看似无响应”。
- 空结果显示“当前筛选下暂无任务”。

## 5. API 约定
- 鉴权头：`Authorization: Bearer <token>`
- 统一响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

- 典型接口：
  - `POST /api/auth/login`
  - `GET /api/me`
  - `GET /api/tasks`
  - `POST /api/tasks`
  - `PUT /api/tasks/{id}`
  - `DELETE /api/tasks/{id}`

## 6. 联调脚本
- `scripts/run_regression.ps1`：回归入口
- `scripts/verify_api.ps1`：API 冒烟
- `scripts/run_graduation_suite.ps1`：毕业设计验收套件（输出 JSON + Markdown 结构化报告）
- `backend/check_reports.ps1`：报表接口检查
- `backend/scripts/stop_java.ps1`：释放 Java 占用进程

示例：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run_graduation_suite.ps1
```

## 7. 常见问题

### 7.1 创建任务出现 404/405/5xx
- 前端已支持自动离线保存并待后续同步。
- 优先排查后端是否启动：`http://localhost:8080/actuator/health`。

### 7.2 push 被拒绝（non-fast-forward）
- 先执行 `git pull --rebase origin main`，处理冲突后再 push。
- 避免把运行日志和临时目录提交（如 `backend_run.log/err`、`tmp/`）。

### 7.3 401/403
- 检查 token 是否存在且有效。
- local 模式可使用 dev token 进行联调。

## 8. 提交规范（建议）
- 推荐格式：`type: summary`
- 示例：
  - `fix: 修复待办页创建任务网络降级逻辑`
  - `feat: 增加侧边栏筛选交互`
  - `chore: 补充联调脚本与文档`

## 9. 下一步建议
1. 给排序与筛选状态增加持久化（刷新不丢状态）。
2. 完成“已分配给我”真实后端字段对齐。
3. 完善任务同步冲突策略（本地与远端并发修改）。

## 10. 2026-03-21 开发记录

### 10.1 今日目标与结果
- 目标：修复登录页卡住/504、日历交互异常、昵称不同步、手机号与扫码登录链路不完整。
- 结果：网页已恢复正常访问，登录链路增加超时与回退，核心业务页面可用性恢复。

### 10.2 前端代码变更
- 登录与注册链路增强：
  - `frontend/登录页面.html`
  - `frontend/注册页面.html`
  - 新增手机号账号映射为 `手机号@mobile.local` 的兼容逻辑。
  - “其他方式登录/扫码”改为真实后端 `register + login` 流程，不再仅本地模拟。
  - 认证请求增加短超时（8s）与 504/timeout 友好提示。
- 请求层稳定性增强：
  - `frontend/common.js`
  - `apiRequest` 增加默认超时（10s）与 `AbortController` 中断。
  - `/api/*` 在 5xx（含 504）时自动回退候选基址。
  - 生产环境加入 `:7833` 备用入口自动重试。
- 日历页修复：
  - `frontend/日历页面.html`
  - 增加分类筛选（全部/工作/学习/生活/健康）并统一作用于月/周/日视图与任务池。
  - 加入日期合法性保护、视图切换定时器防抖，修复切换卡死风险。
- 个人中心昵称同步：
  - `frontend/个人中心页面.html`
  - 引入统一 `syncProfileIdentityUi()`，初始化、`/api/me` 回填、昵称保存后同步顶部展示。
- 页面加载优化：
  - 多页面移除 `reload.js`，Tailwind CDN 改为 `defer`，减少首屏阻塞。

### 10.3 后端代码变更
- 认证入参与落库：
  - `backend/src/main/java/com/ringnote/backend/dto/AuthRequest.java`
  - 新增 `phone` 字段与手机号格式校验。
  - `backend/src/main/java/com/ringnote/backend/service/AuthService.java`
  - 注册流程写入 `phone` 字段。
- 数据源稳定性配置：
  - `backend/src/main/resources/application.properties`
  - 增加 Hikari 连接池超时、校验、保活与泄漏检测参数，降低后端请求悬挂概率。

### 10.4 发布与版本记录
- 已完成代码上传、服务重启与线上恢复。
- GitHub 同步提交：`b0ad54d`（main）。

## 11. 2026-03-22 开发记录

### 11.1 今日目标与结果
- 目标：修复日历页顶部“月/周/日视图”切换卡顿，降低数据周报页进入时等待感。
- 结果：视图切换稳定性已增强，周报首屏改为“先渲染后同步”，可交互时间明显提前。

### 11.2 前端代码变更
- 日历视图稳定性与性能：
  - `frontend/日历页面.html`
  - 顶部视图按钮显式设置 `type="button"`，避免默认行为干扰点击切换。
  - 视图切换事件增加 `preventDefault/stopPropagation`，减少误触发链路。
  - `switchToView` 增加切换互斥锁与异常兜底，避免渲染异常导致假死。
  - 周视图/日视图渲染改为按日期索引映射，减少重复过滤计算。
- 数据周报首屏加载优化：
  - `frontend/数据周报页面.html`
  - 初始化流程改为：先执行本地统计渲染，再后台异步远端同步。
  - AI 建议请求改为异步刷新，不再阻塞页面进入。

### 11.3 回归与验证
- 新增脚本：
  - `scripts/e2e/calendar_report_smoke.cjs`
  - `scripts/e2e/social_login_smoke.cjs`
  - `scripts/e2e/tmp_checkin_console.cjs`
- 校验结果：
  - 社交登录冒烟通过（JWT 有效，未启用 devSkipAuth）。
  - 打卡页中文展示正常，控制台错误数为 0。

### 11.4 GitHub 记录
- GitHub 同步提交：`4e97f3a`（main）。
