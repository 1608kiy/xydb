# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

This repository contains multiple areas, but the main application is under `WEB/`.

- `WEB/frontend/`: static multi-page frontend using HTML, Tailwind CDN, and vanilla JavaScript.
- `WEB/backend/`: Spring Boot backend using Maven Wrapper, JWT auth, Spring Security, JPA, MySQL for default/prod, and H2 for local profile.
- `WEB/scripts/`: PowerShell and Node/Playwright regression, API, and UI automation scripts.
- `WEB/docs/`: primary project documentation. Start with `WEB/docs/DEVELOPMENT.md`, then `接口与数据结构设计文档.md` and deployment docs when needed.
- `SFOTWARE/`: mobile-planning documentation, separate from the main web app.

Do not treat generated/runtime folders as source of truth: `tmp/`, `WEB/tmp/`, `WEB/REPORTS/`, `.venv/`, `node_modules/`, `.codex-temp/`, backend run logs, and browser/profile artifacts.

## Common commands

Run commands from the indicated directory. Paths contain spaces, so quote them in shell commands.

### Backend

From `WEB/backend`:

```bash
cmd.exe /c "mvnw.cmd -Dspring-boot.run.profiles=local spring-boot:run"
```

The local profile uses H2 memory DB for easier development. Health check:

```bash
curl -I http://localhost:8080/actuator/health
```

Build/test backend from `WEB/backend`:

```bash
cmd.exe /c "mvnw.cmd test"
cmd.exe /c "mvnw.cmd package"
```

Run one Maven test class from `WEB/backend`:

```bash
cmd.exe /c "mvnw.cmd -Dtest=ClassName test"
```

### Frontend

Frontend pages can be opened directly from `WEB/frontend/*.html`. If serving through a static server, ensure `/api` proxies to the backend, or set `window.__API_BASE__` / `localStorage.apiBase`.

Useful pages:

- `WEB/frontend/登录页面.html`
- `WEB/frontend/注册页面.html`
- `WEB/frontend/待办页面.html`
- `WEB/frontend/日历页面.html`
- `WEB/frontend/番茄钟页面.html`
- `WEB/frontend/数据周报页面.html`
- `WEB/frontend/打卡页面.html`
- `WEB/frontend/个人中心页面.html`
- `WEB/frontend/后台管理页面.html`

### Regression and UI checks

From `WEB`:

```bash
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/run_regression.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/verify_api.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/run_graduation_suite.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/run_ui_automation.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/run_frontend_interaction_test.ps1
```

From `WEB/scripts/e2e`:

```bash
npm run ui:auto
npm run ui:interaction
npm run ui:suite
```

The root `package.json` is a placeholder; do not use it as the app runner.

## Architecture notes

The frontend is page-oriented rather than component-build-tool based. Shared behavior is mostly in:

- `WEB/frontend/common.js`: API request layer, auth helpers, and shared client utilities.
- `WEB/frontend/components.js`: shared UI helpers/components.
- `WEB/frontend/data.js`: shared/static frontend data.

The backend follows a typical Spring Boot layered structure under `WEB/backend/src/main/java/com/ringnote/backend/`. It uses JWT auth and a unified response shape documented in `WEB/docs/接口与数据结构设计文档.md`:

```json
{"code": 200, "message": "success", "data": {}}
```

Authenticated requests use:

```text
Authorization: Bearer <token>
```

Before changing APIs or frontend/backend contract behavior, read `WEB/docs/接口与数据结构设计文档.md` and check the relevant frontend call sites in `common.js` and the target page.

## Working preferences

- For normal local development, file reads/searches, code edits, local checks, and local browser validation may be done without repeated confirmation.
- Ask before GitHub upload/push/PR actions, server access, deployment, destructive cleanup, system-level changes, or credential/permission changes.
- For frontend changes, run or open the page locally and verify the changed path in a browser when practical.
