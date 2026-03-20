# 项目开发文档（更新于 2026-03-20）

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
cd "E:\computer science\xydb\backend"
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
- `backend/check_reports.ps1`：报表接口检查
- `backend/scripts/stop_java.ps1`：释放 Java 占用进程

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
