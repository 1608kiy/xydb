# Vue 重构本地开发启动指南

## 🚀 实时状态（2026-04-15）

### 前端（前端-vue）
- ✅ **状态**：运行中
- ✅ **地址**：http://localhost:5173
- ✅ **依赖**：npm install 已完成（144 packages）
- ✅ **Vite 服务器**：已启动，HMR 活跃

### 后端（Spring Boot）
- 🔄 **状态**：启动中
- 🔄 **地址**：http://localhost:8080
- 🔄 **环境**：local profile，端口 8080
- 🔄 **状态**：正在编译（36 个源文件）

---

## 📋 手动启动步骤

### 前端启动
```bash
cd e:\computer science\xydb\SFOTWARE\frontend-vue
npm run dev
```
→ 访问 **http://localhost:5173**

### 后端启动
```bash
cd e:\computer science\xydb\WEB\backend
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local" "-Dspring-boot.run.arguments=--server.port=8080"
```
→ 后端启动完毕后访问 **http://localhost:8080**

---

## 🧪 测试场景

### 场景 1：首页加载（无需认证）
1. 打开 http://localhost:5173
2. **预期结果**：看到"铃记"首页，有"登录"和"注册"两个按钮
3. 点击"登录" → 跳转到登录页

### 场景 2：用户注册
1. 点击"注册"按钮
2. 输入：
   - 用户名：`test_user`
   - 邮箱：`test@example.com`
   - 密码：`password123`
3. 点击"注册"
4. **预期结果**：
   - 显示"注册成功"提示
   - 跳转到待办页
   - localStorage 中保存 `auth_token`

### 场景 3：用户登录
1. 打开 http://localhost:5173/login
2. 输入刚才注册的邮箱和密码
3. 点击"登录"
4. **预期结果**：
   - 显示"登录成功"提示
   - 跳转到待办页
   - localStorage 中保存 `auth_token`

### 场景 4：待办事项 CRUD
1. 登录后进入待办页（http://localhost:5173/todo）
2. **输入框中输入任务**：`完成 Vue 重构`
3. 点击"添加"
4. **预期结果**：
   - 任务出现在列表中
   - 显示"任务添加成功"提示
   - 任务项显示完整信息

### 场景 5：完成任务
1. 点击任务前面的复选框
2. **预期结果**：
   - 任务标题出现删除线（line-through）
   - 任务状态更新（API 调用）

### 场景 6：删除任务
1. 点击任务右侧的"删除"图标
2. **预期结果**：
   - 任务从列表移除
   - 显示"任务删除成功"提示

### 场景 7：路由导航
1. 点击顶部导航栏中的各个链接：
   - "待办" → /todo
   - "日历" → /calendar
   - "番茄钟" → /pomodoro
   - "周报" → /report
   - "打卡" → /checkin
   - "个人中心" → /profile
2. **预期结果**：
   - 页面无缝切换
   - URL 正确更新
   - 页面内容正确显示

### 场景 8：个人中心 & 登出
1. 点击右上角"用户菜单" → "个人中心"
2. 看到用户名和邮箱显示
3. 点击"退出登录"
4. **预期结果**：
   - 显示"已退出登录"提示
   - 跳转到首页 (/)
   - localStorage 中 `auth_token` 被清空

---

## 🔧 调试工具

### 浏览器 DevTools (F12)

#### Vue DevTools 标签
- 查看组件树
- 检查 Pinia stores 状态
- 观察 `authStore`、`taskStore`、`toastStore` 的实时状态

#### Network 标签
- 监控所有 API 请求
- 检查 HTTP 状态码（200、401、500 等）
- 验证 `Authorization` header 是否正确注入

#### Console 标签
- 查看 JavaScript 错误
- 输入 `localStorage.auth_token` 验证 token 保存

#### Application 标签
- LocalStorage 中查看存储数据
- 确认 `auth_token` 和其他状态存储正确

### Vue 应用调试
```javascript
// 在 Console 中执行
import { useAuthStore } from '@/stores/auth'
const authStore = useAuthStore()
console.log(authStore.user)        // 查看当前用户
console.log(authStore.token)       // 查看 token
console.log(authStore.isLoggedIn)  // 查看登录状态
```

---

## ⚠️ 常见问题排查

### 问题 1：前端无法连接后端 API
**症状**：登录点击后无反应，Network 中看不到 API 请求

**排查步骤**：
1. 确认后端确实在 8080 运行
   ```bash
   netstat -ano | findstr "8080"
   ```
2. 检查浏览器 Console 是否有 CORS 错误
3. 检查 vite.config.ts 中的 API 代理配置

**解决方案**：
- 确保后端完全启动并打印了"Tomcat started"日志
- 访问 http://localhost:8080 确认后端响应
- 查看 Network 标签中的 API 请求详情

### 问题 2：页面显示空白
**症状**：浏览器打开 5173 但页面是空白

**排查步骤**：
1. 在 Console 中查看 JavaScript 错误
2. 检查 vite 服务器是否正常运行（应该在 src 文件监听变化）
3. 刷新浏览器

**解决方案**：
- 停止 npm run dev 并重新运行
- 清理浏览器缓存
- 检查 Node.js 和 npm 版本是否满足要求

### 问题 3：token 过期导致 401
**症状**：登录后访问待办页面显示 401 错误

**排查步骤**：
1. 查看 localStorage 中的 token 是否存在
2. 检查 Network 中的 Authorization header

**解决方案**：
- 重新登录获取新 token
- 检查后端的 token 过期时间配置

### 问题 4：样式显示异常
**症状**：页面加载但样式混乱或缺失

**排查步骤**：
1. 检查浏览器 DevTools → Network 中 CSS 文件是否加载
2. 查看 Console 中是否有 CSS 加载错误

**解决方案**：
- 检查 Tailwind CSS 是否正确配置
- 尝试硬刷新页面（Ctrl+Shift+R）
- 重新运行 npm run dev

---

## 📊 API 测试

### 快速 API 测试（使用 curl 或 Postman）

#### 1. 注册用户
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "password": "password123"
  }'
```

#### 2. 登录
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```
**响应示例**：
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "test@example.com",
    "name": "Test User"
  }
}
```

#### 3. 获取任务列表（需要 token）
```bash
curl -X GET http://localhost:8080/api/tasks \
  -H "Authorization: Bearer <your_token>"
```

#### 4. 创建任务（需要 token）
```bash
curl -X POST http://localhost:8080/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_token>" \
  -d '{
    "title": "Complete Vue refactor",
    "description": "Finish the refactoring to Vue 3",
    "dueDate": "2026-04-20T23:59:59"
  }'
```

---

## ✅ 完整测试清单

首次本地启动验证时，请按以下顺序检查：

- [ ] 前端在 5173 加载
- [ ] 首页显示"铃记"和登录/注册按钮
- [ ] 后端在 8080 运行（查看 Spring Boot 启动日志）
- [ ] 注册新用户成功
- [ ] 登录成功直达待办页
- [ ] 添加任务成功（出现在列表中）
- [ ] 完成任务成功（显示删除线）
- [ ] 删除任务成功
- [ ] 路由导航正常（各页面可访问）
- [ ] 退出登录成功（跳回首页）
- [ ] Devtools → Network 中 API 响应正常（200 状态码）
- [ ] Devtools → Console 无 JavaScript 错误
- [ ] localStorage 正确存储 auth_token

---

## 🎯 后续工作

本地验证通过后，按以下步骤进行：

1. **补充页面功能**
   - 完善日历、番茄钟、周报、打卡等页面的业务逻辑

2. **集成更多 API**
   - 连接后端各个功能接口

3. **性能优化**
   - 路由懒加载
   - 代码分割
   - 缓存策略

4. **构建生产版**
   ```bash
   npm run build
   ```
   生成的 `dist/` 目录即为发布产物

5. **部署到服务器**
   - 上传 dist/ 到 /opt/ringnote/frontend/
   - 更新 APK WebView 指向新站点

---

**最后更新**：2026-04-15 09:30  
**环境**：Windows 10 / Node.js 18+ / npm 9+
