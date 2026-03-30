# 📁 XYDB 项目结构说明

## 🎯 项目组织架构

```
XYDB/
├── 📂 .git/              ← GitHub 版本控制（从 WEB 提升到根目录）
├── 📂 .github/           ← GitHub Actions & 配置（从 WEB 提升到根目录）
├── 📄 .gitignore         ← Git 忽略规则（从 WEB 提升到根目录）
│
├── 📂 SFOTWARE/          ← 【软件端】移动端项目
│   ├── 📄 01-移动端项目总体规划.md
│   ├── 📄 02-功能对齐清单.md
│   ├── 📄 03-技术方案与架构设计.md
│   ├── 📄 04-接口联调与数据互通方案.md
│   ├── 📄 05-开发排期与里程碑.md
│   ├── 📄 06-测试与发布方案.md
│   ├── 📄 README.md
│   │
│   └── 📂 frontend/      ← 移动端 H5 代码
│       ├── 📄 index.html                    (登录页)
│       ├── 📄 注册页面.html                 (注册页)
│       ├── 📄 待办页面.html                 (任务管理)
│       ├── 📄 日历页面.html                 (日期规划)
│       ├── 📄 番茄钟页面.html               (计时工具)
│       ├── 📄 打卡页面.html                 (打卡系统)
│       ├── 📄 数据周报页面.html             (数据分析)
│       └── 📄 个人中心页面.html             (个人管理)
│
├── 📂 SHARE/             ← 【共享库】所有端口共用
│   ├── 📄 data.js        ← Mock API 和应用数据
│   ├── 📄 common.js      ← 工具函数库
│   └── 📂 assets/        ← 共享资源文件
│
└── 📂 WEB/               ← 【Web端】网页项目
    ├── 📂 backend/       ← Java Spring Boot 后端
    ├── 📂 frontend/      ← Web H5 前端
    ├── 📂 scripts/       ← 自动化脚本
    ├── 📂 tmp/           ← 临时文件
    ├── 📂 REPORTS/       ← 测试报告
    └── 📄 *.md           ← 各类文档
```

## 🏗️ 各部分说明

### 1️⃣ SFOTWARE/ - 软件端（移动端应用）
- **位置**: `/SFOTWARE/`
- **内容**: 铃记移动端 H5 代码
- **子目录**:
  - `frontend/` - 8个完整页面 + 功能模块
- **规划文档**: 项目规划、技术方案、接口设计等
- **用途**: 独立上传到 GitHub 作为软件端仓库

### 2️⃣ SHARE/ - 共享库
- **位置**: `/SHARE/`
- **内容**: 
  - `data.js` - Mock API 系统（模拟后端数据）
  - `common.js` - 工具函数库（UI组件、工具函数）
  - `assets/` - 共享资源文件
- **用途**: 所有前端页面（WEB/frontend, SFOTWARE/frontend）共用
- **引用方式**: 
  - WEB 端: `../../SHARE/data.js`
  - SFOTWARE 端: `../../SHARE/data.js`

### 3️⃣ WEB/ - Web端
- **位置**: `/WEB/`
- **内容**: 网页版应用 (Web H5 + 后端)
- **结构**:
  - `backend/` - Java Spring Boot 服务
  - `frontend/` - Web H5 页面
  - `scripts/` - 测试和部署脚本
  - `REPORTS/` - 测试报告
  - 各类文档

### 4️⃣ GitHub 文件 - 版本控制
- **位置**: `/` (根目录)
- **文件**:
  - `.git/` - Git 仓库数据
  - `.github/` - GitHub Actions 配置
  - `.gitignore` - Git 忽略规则
- **说明**: 从 WEB/ 提升到根目录，便于整体管理

## 📝 文件导入路径

### SFOTWARE/frontend HTML 文件
```html
<!-- 正确的导入方式 -->
<script src="../../SHARE/data.js?v=20260330"></script>
<script src="../../SHARE/common.js?v=20260330"></script>
```

### WEB/frontend HTML 文件
```html
<!-- 正确的导入方式 -->
<script src="../../SHARE/data.js"></script>
<script src="../../SHARE/common.js"></script>
```

## 🎯 后续工作流

### 1. 软件端上传 (SFOTWARE)
```bash
cd SFOTWARE/
git init
git add .
git commit -m "初始提交：移动端H5版本"
git branch -M main
git remote add origin https://github.com/user/xydb-mobile.git
git push -u origin main
```

### 2. Web端上传 (WEB)
```bash
cd WEB/
# 或者直接用根目录的git配置上传整个项目
```

### 3. 共享库维护 (SHARE)
- 修改 `data.js` 或 `common.js` 后会自动生效于所有引用页面
- 建议在两端生效前充分测试

## ✅ 优势

| 方面 | 说明 |
|------|------|
| **清晰分类** | WEB端、软件端清晰分离 |
| **共享管理** | 共享库集中管理，修改一处生效多处 |
| **独立上传** | 各端代码可独立上传到GitHub |
| **易于维护** | 结构清晰，责任明确 |
| **版本控制** | GitHub文件统一管理 |

## 🚀 启动方式

### 运行软件端 (SFOTWARE)
```bash
# 打开 SFOTWARE/frontend/index.html 
# 用 VS Code Live Server 或浏览器直接打开
```

### 运行 Web 端 (WEB)
```bash
cd WEB/
# 后端
cd backend/
mvn spring-boot:run

# 前端（另开终端）
cd frontend/
# 用 Live Server 打开
```

## 📋 文件清单

### SFOTWARE/frontend (8个页面)
- ✅ index.html - 登录页
- ✅ 注册页面.html
- ✅ 待办页面.html
- ✅ 日历页面.html
- ✅ 番茄钟页面.html
- ✅ 打卡页面.html
- ✅ 数据周报页面.html
- ✅ 个人中心页面.html

### SHARE (共享库)
- ✅ data.js - 完整 Mock API
- ✅ common.js - 工具函数库
- ✅ assets/ - 资源文件夹

---

**项目重组完成日期**: 2026-03-30  
**状态**: ✅ 组织完毕，可以开始上传
