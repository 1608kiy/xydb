# Vue 重构完成清单

## ✅ 第一阶段：框架搭建（已完成）

### 项目配置
- [x] package.json - npm 依赖清单完整
- [x] vite.config.ts - 打包配置 + API 代理（localhost:8080）
- [x] tsconfig.json - TypeScript 严格模式
- [x] index.html - 模板文件
- [x] .env.development - 开发环境变量
- [x] .env.production - 生产环境变量

### 核心层
- [x] src/main.ts - Vue 应用入口
- [x] src/App.vue - 根组件（含 Toast）
- [x] src/router.ts - 8 个路由 + 鉴权守卫
- [x] src/assets/styles/global.css - 全局样式 + CSS 变量

### API 层
- [x] src/api/client.ts - Axios 客户端（token 管理 + 401 处理）
- [x] src/api/auth.ts - 登录/注册/登出 API
- [x] src/api/task.ts - 任务 CRUD API

### 状态管理（Pinia）
- [x] src/stores/auth.ts - 认证状态（login/logout/register）
- [x] src/stores/task.ts - 任务状态（CRUD + loading）
- [x] src/stores/toast.ts - 提示消息管理

### 核心组件
- [x] src/components/Header.vue - 导航栏
- [x] src/components/Footer.vue - 移动端底部 Tab
- [x] src/components/PageLayout.vue - 页面布局容器
- [x] src/components/Toast.vue - 消息提示组件

---

## ✅ 第二阶段：页面组件（已完成）

### 页面组件
- [x] src/pages/IndexPage.vue - 首页（登录/注册入口）
- [x] src/pages/LoginPage.vue - 登录页
- [x] src/pages/RegisterPage.vue - 注册页
- [x] src/pages/TodoPage.vue - 待办事项（集成 TaskItem）
- [x] src/pages/CalendarPage.vue - 日历
- [x] src/pages/PomodoroPage.vue - 番茄钟
- [x] src/pages/ReportPage.vue - 周报
- [x] src/pages/CheckinPage.vue - 打卡
- [x] src/pages/ProfilePage.vue - 个人中心

### 业务子组件
- [x] src/components/TaskItem.vue - 任务项组件
- [x] src/components/PomodoroTimer.vue - 番茄钟计时器
- [x] src/components/CheckinCard.vue - 打卡卡片
- [x] src/components/WeeklyReport.vue - 周报统计

---

## 🔲 第三阶段：本地验证 (待进行)

### 前提条件
- [ ] Node.js >= 16 已安装
- [ ] npm >= 7 已安装
- [ ] 后端服务已启动（localhost:8080）

### 启动步骤
```bash
# 进入项目目录
cd SFOTWARE/frontend-vue

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问
# http://localhost:5173
```

### 功能测试清单
- [ ] 首页加载正常
- [ ] 登录流程完整（填入邮箱/密码 → API 调用 → token 保存）
- [ ] 注册流程完整
- [ ] 任务列表加载（GET /api/tasks）
- [ ] 添加任务成功（POST /api/tasks）
- [ ] 完成/删除任务成功
- [ ] 路由切换正常
- [ ] 移动端底部 Tab 可用
- [ ] 提示消息正常显示

### 调试工具
- [ ] 打开 Vue DevTools（F12 → Vue）
- [ ] 检查 Network 标签（API 调用）
- [ ] 查看 Console（错误日志）
- [ ] 查看 Application → LocalStorage（token）

---

## 🔲 第四阶段：打包与发布 (待进行)

### 打包命令
```bash
npm run build
# 生成 dist/ 目录
```

### 发布步骤
- [ ] 构建产品版本：`npm run build`
- [ ] 上传 dist/ 到服务器 `/opt/ringnote/frontend/`
- [ ] 验证线上访问 `https://ringnote.isleepring.cn`
- [ ] APK WebView 指向新前端

### 验证项
- [ ] 首页加载速度 < 2s
- [ ] 登录/注册流程正常
- [ ] 任务 CRUD 完整
- [ ] 移动端适配正确
- [ ] 无控制台错误

---

## 📋 后续优化任务

### 页面功能完善
- [ ] CalendarPage - 实现日历选择器 + 日期任务展示
- [ ] PomodoroPage - 完整计时器 + 历史统计
- [ ] ReportPage - 图表显示（完成率、时间分布）
- [ ] CheckinPage - 连续打卡计数 + 历史日期
- [ ] ProfilePage - 用户头像上传、个人信息编辑

### 组件增强
- [ ] 任务编辑模态框
- [ ] 任务过滤/排序
- [ ] 搜索功能
- [ ] 批量操作

### 样式优化
- [ ] 响应式设计更新（平板/桌面）
- [ ] 深色模式支持
- [ ] 样式细节调整

### 性能优化
- [ ] 路由懒加载
- [ ] 代码分割
- [ ] 缓存策略
- [ ] 图片压缩

---

## 🚀 项目结构总览

```
SFOTWARE/frontend-vue/
├── package.json                    ✅
├── vite.config.ts                  ✅
├── tsconfig.json                   ✅
├── index.html                      ✅
├── .env.development                ✅
├── .env.production                 ✅
├── src/
│   ├── main.ts                     ✅
│   ├── App.vue                     ✅
│   ├── router.ts                   ✅
│   ├── components/
│   │   ├── Header.vue              ✅
│   │   ├── Footer.vue              ✅
│   │   ├── PageLayout.vue          ✅
│   │   ├── TaskItem.vue            ✅
│   │   ├── PomodoroTimer.vue       ✅
│   │   ├── CheckinCard.vue         ✅
│   │   ├── WeeklyReport.vue        ✅
│   │   └── Toast.vue               ✅
│   ├── pages/
│   │   ├── IndexPage.vue           ✅
│   │   ├── LoginPage.vue           ✅
│   │   ├── RegisterPage.vue        ✅
│   │   ├── TodoPage.vue            ✅
│   │   ├── CalendarPage.vue        ✅
│   │   ├── PomodoroPage.vue        ✅
│   │   ├── ReportPage.vue          ✅
│   │   ├── CheckinPage.vue         ✅
│   │   └── ProfilePage.vue         ✅
│   ├── stores/
│   │   ├── auth.ts                 ✅
│   │   ├── task.ts                 ✅
│   │   └── toast.ts                ✅
│   ├── api/
│   │   ├── client.ts               ✅
│   │   ├── auth.ts                 ✅
│   │   └── task.ts                 ✅
│   └── assets/
│       ├── styles/
│       │   └── global.css           ✅
│       └── images/                 🔲
```

---

## 📌 关键约定

### API 约定
- Base URL: `http://localhost:8080` (开发) / `https://ringnote.isleepring.cn` (生产)
- 认证: 所有受保护 API 需在 Header 中包含 `Authorization: Bearer {token}`
- 401 处理: 自动跳转到登录页

### 路由约定
- `/` - 首页（未认证时显示）
- `/login` - 登录
- `/register` - 注册
- `/todo` - 待办（需认证）
- `/calendar` - 日历（需认证）
- `/pomodoro` - 番茄钟（需认证）
- `/report` - 周报（需认证）
- `/checkin` - 打卡（需认证）
- `/profile` - 个人中心（需认证）

### 状态管理
- 凡认证相关 → 使用 `useAuthStore()`
- 凡任务相关 → 使用 `useTaskStore()`
- 凡消息相关 → 使用 `useToastStore()`

---

## 📝 操作指南

### 本地开发流程

1. **每次启动开发**
   ```bash
   cd SFOTWARE/frontend-vue
   npm run dev
   ```

2. **修改代码后自动热更新** (Vite 支持 HMR)

3. **构建产品版**
   ```bash
   npm run build
   dist/ 生成完成后，可上传至服务器
   ```

4. **预览产品构建**
   ```bash
   npm run preview
   ```

---

最后更新：当前 UTC 时间
