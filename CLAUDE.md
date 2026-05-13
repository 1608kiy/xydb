# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

XYDB (铃记/RingNote) is a productivity app with task management, pomodoro timer, check-in, calendar, and weekly reports. Built as a university software engineering practice project.

## Repository Structure

```
XYDB/
├── SFOTWARE/          # Mobile H5 frontend (8 pages)
├── SHARE/             # Shared libraries used by both WEB and SFOTWARE
│   ├── data.js        # Mock API and application data
│   ├── common.js      # UI components and utility functions
│   └── assets/        # Shared resources
└── WEB/               # Main web application
    ├── frontend/      # Static multi-page HTML + Tailwind CDN + vanilla JS
    ├── backend/       # Spring Boot (Java 17+, Maven, JWT, H2/MySQL)
    ├── scripts/       # PowerShell regression and Playwright e2e tests
    └── docs/          # Start with DEVELOPMENT.md
```

## Common Commands

### Backend (from `WEB/backend`)

```bash
# Run with local H2 database (recommended for development)
cmd.exe /c "mvnw.cmd -Dspring-boot.run.profiles=local spring-boot:run"

# Health check
curl -I http://localhost:8080/actuator/health

# Run all tests
cmd.exe /c "mvnw.cmd test"

# Run single test class
cmd.exe /c "mvnw.cmd -Dtest=ClassName test"
```

### Frontend

Open `WEB/frontend/*.html` directly in browser, or use VS Code Live Server.

### E2E Tests (from `WEB`)

```bash
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/run_regression.ps1
cd WEB/scripts/e2e && npm run ui:auto
```

## Architecture

### Backend Layered Structure (`WEB/backend/src/main/java/com/xydb/backend/`)

- `config/` - SecurityConfig (JWT + Spring Security), JwtAuthenticationFilter, WebConfig
- `controller/` - AuthController, TaskController, UserController, CheckinController, PomodoroController, ReportController, AiController, TagController
- `dto/` - Request/response DTOs (AuthRequest, TaskAutomationRequest, etc.)
- `model/` - JPA entities: User, Task, SubTask, Tag, PomodoroSession, Checkin
- `repository/` - Spring Data JPA repositories
- `service/` - Business logic layer

### API Contract

All responses use unified shape: `{"code": 200, "message": "success", "data": {}}`

Authenticated requests: `Authorization: Bearer <token>`

Key endpoints: `POST /api/auth/login`, `GET /api/me`, `GET|POST /api/tasks`, `PUT|DELETE /api/tasks/{id}`

Before changing APIs, read `WEB/docs/接口与数据结构设计文档.md`.

### Frontend Shared Files

- `WEB/frontend/common.js` - `apiRequest()` function with 10s timeout, auto-fallback to backup hosts on 5xx, offline task queue for network failures
- `WEB/frontend/components.js` - Shared UI helpers
- `WEB/frontend/data.js` - Local data layer

Both `SFOTWARE/` and `WEB/` import from `SHARE/` via relative paths (`../../SHARE/data.js`).

## Working Preferences

- Local file reads/edits and browser validation may proceed without repeated confirmation
- Ask before: git push, deployment, destructive cleanup, system-level changes, credential modifications
- Commit format: `type: summary` (e.g., `fix: 修复待办页网络降级逻辑`, `feat: 增加侧边栏筛选`)
