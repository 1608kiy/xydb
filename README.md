# 铃记 (XYDB) - 生产力工具箱

<p align="center">
    <strong>📋 任务管理 · 番茄钟 · 打卡 · 日历 · 周报</strong>
</p>

<p align="center">
    <img src="https://img.shields.io/badge/java-17-ED8B00.svg?logo=openjdk&logoColor=white" alt="Java">
    <img src="https://img.shields.io/badge/spring_boot-3.x-6DB33F.svg?logo=spring&logoColor=white" alt="Spring Boot">
    <img src="https://img.shields.io/badge/javascript-vanilla-F7DF1E.svg?logo=javascript&logoColor=black" alt="JavaScript">
    <img src="https://img.shields.io/badge/tailwind_css-CDN-06B6D4.svg?logo=tailwindcss&logoColor=white" alt="Tailwind CSS">
</p>

---

## 📖 项目简介

**铃记**是一款轻量级生产力工具，集成任务管理、番茄钟、打卡、日历和周报功能。

大学软件工程实践项目，采用 **Spring Boot后端 + 静态HTML前端** 的极简架构。

## ✨ 核心功能

### 📋 任务管理

- 任务创建、编辑、删除、完成
- 优先级和分类
- 截止日期提醒
- 任务搜索和筛选

### 🍅 番茄钟

- 25分钟专注计时
- 自定义时长
- 休息提醒
- 专注统计

### ✅ 打卡系统

- 每日打卡
- 连续打卡统计
- 打卡日历视图
- 打卡提醒

### 📅 日历

- 月视图/周视图
- 任务和打卡标记
- 日程管理
- 数据同步

### 📊 数据周报

- 每周任务完成统计
- 番茄钟使用报告
- 打卡完成率
- 生产力趋势分析

### 👤 个人中心

- 个人信息管理
- 学习设置
- 数据导出

## 🏗️ 技术架构

```
┌─────────────────────────────────────────┐
│     Web前端 (HTML + Tailwind CDN)       │
│     移动端 H5 (Vue3 + Capacitor)        │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────┴──────────────────────┐
│         Spring Boot 3.x 后端            │
│    (JWT认证 / H2+MySQL / REST API)     │
└─────────────────────────────────────────┘
```

### 技术栈

| 层级 | 技术 |
|------|------|
| **后端** | Java 17 + Spring Boot 3.x + Spring Data JPA + JWT |
| **Web前端** | 原生HTML + Tailwind CSS CDN + Vanilla JS |
| **移动端** | Vue3 + Capacitor (H5打包原生App) |
| **数据库** | H2 (开发) / MySQL (生产) |
| **测试** | JUnit 5 + Playwright E2E |
| **CI/CD** | GitHub Actions |

## 🚀 快速开始

### 环境要求

- Java 17+
- Maven

### 后端

```bash
cd WEB/backend

# 使用H2内存数据库运行（推荐开发）
mvnw.cmd -Dspring-boot.run.profiles=local spring-boot:run

# 健康检查
curl -I http://localhost:8080/actuator/health

# 运行测试
mvnw.cmd test
```

### 前端

```bash
# 直接用浏览器打开
cd WEB/frontend
# 打开 index.html 即可

# 或使用 VS Code Live Server
```

### E2E测试

```bash
cd WEB
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/run-e2e.ps1
```

## 📁 项目结构

```
XYDB/
├── SFOTWARE/          # 移动端 H5 前端
│   └── frontend/      # 8个完整页面
├── SHARE/             # 共享库
│   ├── data.js        # Mock API 和数据
│   ├── common.js      # 工具函数
│   └── assets/        # 共享资源
└── WEB/               # Web端
    ├── frontend/      # 静态HTML前端
    ├── backend/       # Spring Boot后端
    ├── scripts/       # 自动化脚本
    └── docs/          # 文档
```

## 🧪 测试

```bash
# 后端单元测试
cd WEB/backend
mvnw.cmd test

# E2E测试（需要Playwright）
cd WEB
powershell scripts/run-e2e.ps1

# 回归测试
powershell scripts/regression.ps1
```

## 📱 移动端

移动端使用 Vue3 + Capacitor，与Web端共享同一后端API。

```bash
cd SFOTWARE/frontend
npm install
npm run dev

# 构建Android APK
npx cap sync
npx cap open android
```

## 📄 License

MIT License
