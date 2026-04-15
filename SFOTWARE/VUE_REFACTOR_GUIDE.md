# SFOTWARE 前端 Vue 重构指南

## 1. 目标

从纯 HTML/CSS/JS 重构为 Vue 3 + Vite + Pinia 框架，保持功能一致，提升代码可维护性与工程化能力。

## 2. 当前状态

- 代码规模：1.28 MB
- 文件数：60 个（HTML 10 个、JS 35 个、CSS 11 个）
- 架构：多页面 HTML + 全局 AppState 对象 + 字符串模板渲染
- 状态管理：简单的全局 `AppState` 对象
- API 调用：原生 fetch，无统一处理

## 3. 目标架构

```
SFOTWARE/
├── frontend-vue/              # 新的 Vue 项目根目录
│   ├── src/
│   │   ├── components/        # Vue 组件
│   │   │   ├── Header.vue
│   │   │   ├── Footer.vue
│   │   │   ├── TaskItem.vue
│   │   │   ├── ...
│   │   ├── pages/             # 页面组件（原 .html 文件对应）
│   │   │   ├── TodoPage.vue
│   │   │   ├── CalendarPage.vue
│   │   │   ├── PomodoroPage.vue
│   │   │   ├── ReportPage.vue
│   │   │   ├── CheckinPage.vue
│   │   │   ├── ProfilePage.vue
│   │   │   ├── LoginPage.vue
│   │   │   ├── RegisterPage.vue
│   │   ├── stores/            # Pinia 状态管理
│   │   │   ├── auth.ts        # 认证状态
│   │   │   ├── task.ts        # 任务状态
│   │   │   ├── pomodoro.ts    # 番茄钟状态
│   │   │   └── ...
│   │   ├── api/               # API 请求统一处理
│   │   │   ├── client.ts      # Axios 客户端配置
│   │   │   ├── auth.ts        # 认证相关 API
│   │   │   ├── task.ts        # 任务相关 API
│   │   │   └── ...
│   │   ├── utils/             # 工具函数
│   │   │   ├── toast.ts       # 提示消息
│   │   │   ├── validators.ts  # 验证函数
│   │   │   └── ...
│   │   ├── assets/            # 静态资源
│   │   │   ├── styles/
│   │   │   └── images/
│   │   ├── App.vue            # 根组件
│   │   ├── main.ts            # 入口文件
│   │   └── router.ts          # 路由配置
│   ├── index.html             # 模板 HTML
│   ├── vite.config.ts         # Vite 配置
│   ├── tsconfig.json          # TypeScript 配置
│   ├── package.json           # 依赖配置
│   └── ...
├── frontend/                  # 原始文件备份
│   ├── (保持不动，作为参考)
```

## 4. 分阶段重构计划（3-5 天）

### 阶段 1：项目初始化与基础架构（0.5 天）

**任务**
1. 创建新 Vue 3 + Vite 项目
2. 安装依赖：Vue 3、Vue Router、Pinia、Axios、Tailwind CSS
3. 建立上述项目结构
4. 迁移现有 CSS 文件到 `src/assets/styles/`
5. 建立开发/测试/生产环境配置

**命令参考**
```bash
npm create vite@latest frontend-vue -- --template vue-ts
cd frontend-vue
npm install
npm install vue-router pinia axios tailwindcss postcss autoprefixer
npm run dev
```

### 阶段 2：核心组件拆解（1.5 天）

**任务**
1. **Header 组件** (`src/components/Header.vue`)
   - 从 `components.js` 的 `renderHeader()` 转换
   - 使用 v-for 生成导航链接
   - 集成用户信息展示与登出功能

   **转换示例**
   ```vue
   <!-- 原始 JS 代码片段 -->
   const header = `
     <header class="bg-white shadow-sm">
       <a href="待办页面.html">待办</a>
       ...
     </header>
   `;
   
   <!-- 转换后的 Vue 组件 -->
   <template>
     <header class="bg-white shadow-sm sticky top-0 z-30">
       <nav class="container mx-auto px-4 py-3 flex justify-between">
         <div class="flex items-center gap-4">
           <router-link to="/todo" 
             :class="{ 'text-primary': route.path === '/todo' }">
             待办
           </router-link>
           <!-- 其他导航... -->
         </div>
         <div v-if="authStore.user">
           <img :src="authStore.user.avatar" :alt="authStore.user.name" />
           <button @click="logout">退出</button>
         </div>
       </nav>
     </header>
   </template>
   
   <script setup lang="ts">
   import { useAuthStore } from '@/stores/auth'
   import { useRouter, useRoute } from 'vue-router'
   
   const authStore = useAuthStore()
   const router = useRouter()
   const route = useRoute()
   
   const logout = () => {
     authStore.logout()
     router.push('/login')
   }
   </script>
   ```

2. **Footer 组件** (`src/components/Footer.vue`)
   - 同理转换底部导航
   - 使用 `active` class 绑定当前路由

3. **页面容器组件** (`src/components/PageLayout.vue`)
   - 组合 Header + Footer + 页面内容插槽

4. **共用业务组件**
   - `TaskItem.vue` - 任务项组件
   - `PomodoroTimer.vue` - 番茄钟计时器
   - `CheckinCard.vue` - 打卡卡片
   - `WeeklyReport.vue` - 周报表格
   - 等等（从 `components.js` 拆分）

### 阶段 3：页面组件转换（1.5 天）

**映射关系**
| 原 HTML 文件 | 新 Vue 页面组件 | 路由路径 |
|-----------|---------------|---------|
| 待办页面.html | TodoPage.vue | /todo |
| 日历页面.html | CalendarPage.vue | /calendar |
| 番茄钟页面.html | PomodoroPage.vue | /pomodoro |
| 数据周报页面.html | ReportPage.vue | /report |
| 打卡页面.html | CheckinPage.vue | /checkin |
| 个人中心页面.html | ProfilePage.vue | /profile |
| 登录页面.html | LoginPage.vue | /login |
| 注册页面.html | RegisterPage.vue | /register |
| 官网.html | IndexPage.vue | / |
| 小球.html | 分析是否还需要 | - |

**转换步骤**
1. 逐个读取 HTML 文件中的 DOM 结构
2. 提取关键业务逻辑函数到对应的 Vue 组件 `<script setup>`
3. 用 Vue 模板语法替换字符串拼接
4. 绑定事件处理函数到组件方法
5. 使用 Pinia 存储代替全局 `AppState`

**转换示例（待办页面）**
```vue
<!-- TodoPage.vue -->
<template>
  <PageLayout>
    <div class="todo-container">
      <input 
        v-model="newTaskTitle"
        @keyup.enter="addTask"
        placeholder="添加新任务..." />
      <ul>
        <li v-for="task in taskStore.tasks" :key="task.id">
          <TaskItem :task="task" @update="updateTask" @delete="deleteTask" />
        </li>
      </ul>
    </div>
  </PageLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useTaskStore } from '@/stores/task'
import PageLayout from '@/components/PageLayout.vue'
import TaskItem from '@/components/TaskItem.vue'

const taskStore = useTaskStore()
const newTaskTitle = ref('')

const addTask = async () => {
  if (!newTaskTitle.value.trim()) return
  await taskStore.addTask(newTaskTitle.value)
  newTaskTitle.value = ''
}

const updateTask = (taskId: number, updates: any) => {
  taskStore.updateTask(taskId, updates)
}

const deleteTask = (taskId: number) => {
  taskStore.deleteTask(taskId)
}
</script>
```

### 阶段 4：状态管理迁移（1 天）

**建立 Pinia stores**

```typescript
// src/stores/auth.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as authAPI from '@/api/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('token'))

  const login = async (email: string, password: string) => {
    const response = await authAPI.login(email, password)
    token.value = response.token
    user.value = response.user
    localStorage.setItem('token', response.token)
  }

  const logout = () => {
    user.value = null
    token.value = null
    localStorage.removeItem('token')
  }

  const isLoggedIn = computed(() => !!token.value)

  return { user, token, login, logout, isLoggedIn }
})

// src/stores/task.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as taskAPI from '@/api/task'

export const useTaskStore = defineStore('task', () => {
  const tasks = ref([])

  const fetchTasks = async () => {
    tasks.value = await taskAPI.getTasks()
  }

  const addTask = async (title: string) => {
    const newTask = await taskAPI.createTask(title)
    tasks.value.push(newTask)
  }

  const updateTask = async (id: number, updates: any) => {
    await taskAPI.updateTask(id, updates)
    const task = tasks.value.find(t => t.id === id)
    if (task) Object.assign(task, updates)
  }

  const deleteTask = async (id: number) => {
    await taskAPI.deleteTask(id)
    tasks.value = tasks.value.filter(t => t.id !== id)
  }

  return { tasks, fetchTasks, addTask, updateTask, deleteTask }
})
```

### 阶段 5：API 层统一处理（0.5 天）

**建立 Axios 客户端**
```typescript
// src/api/client.ts
import axios from 'axios'
import { useAuthStore } from '@/stores/auth'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  timeout: 10000
})

// 请求拦截器：自动注入 token
client.interceptors.request.use(config => {
  const authStore = useAuthStore()
  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`
  }
  return config
})

// 响应拦截器：统一错误处理
client.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) {
      useAuthStore().logout()
      window.location.href = '/login'
    }
    throw error
  }
)

export default client
```

**API 模块化**
```typescript
// src/api/task.ts
import client from './client'

export const getTasks = () => client.get('/tasks')
export const createTask = (title: string) => client.post('/tasks', { title })
export const updateTask = (id: number, data: any) => client.put(`/tasks/${id}`, data)
export const deleteTask = (id: number) => client.delete(`/tasks/${id}`)
```

### 阶段 6：路由配置（0.5 天）

```typescript
// src/router.ts
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  { path: '/', component: () => import('@/pages/IndexPage.vue') },
  { path: '/login', component: () => import('@/pages/LoginPage.vue') },
  { path: '/register', component: () => import('@/pages/RegisterPage.vue') },
  { path: '/todo', component: () => import('@/pages/TodoPage.vue'), meta: { requiresAuth: true } },
  { path: '/calendar', component: () => import('@/pages/CalendarPage.vue'), meta: { requiresAuth: true } },
  { path: '/pomodoro', component: () => import('@/pages/PomodoroPage.vue'), meta: { requiresAuth: true } },
  { path: '/report', component: () => import('@/pages/ReportPage.vue'), meta: { requiresAuth: true } },
  { path: '/checkin', component: () => import('@/pages/CheckinPage.vue'), meta: { requiresAuth: true } },
  { path: '/profile', component: () => import('@/pages/ProfilePage.vue'), meta: { requiresAuth: true } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫：鉴权检查
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    next('/login')
  } else {
    next()
  }
})

export default router
```

## 5. 工具函数迁移

**原始 JS 工具函数（来自 `components.js` 等）转换为 TypeScript**

```typescript
// src/utils/toast.ts
import { ref } from 'vue'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
}

const toasts = ref<Toast[]>([])

export const showToast = (message: string, type: 'success' | 'error' = 'info', duration = 3000) => {
  const id = Date.now().toString()
  toasts.value.push({ id, message, type })
  
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, duration)
}

export const useToast = () => toasts
```

## 6. CSS 迁移策略

**选项 A：保持现有 CSS**
- 将 `frontend/css/` 文件夹复制到 `src/assets/styles/`
- 在 `src/main.ts` 导入全局样式
- CSS 类名保持不变，Vue 模板中直接使用

**选项 B：重构为 Tailwind CSS（推荐）**
- 使用 Tailwind 内置类替换自定义 CSS
- 减少 CSS 文件维护，提升可维护性
- 安装：`npm install -D tailwindcss postcss autoprefixer`

## 7. 完成检查清单

- [ ] Vue 项目初始化与依赖安装
- [ ] 项目结构建立
- [ ] Header、Footer、主要业务组件创建
- [ ] 8 个页面组件转换完成
- [ ] Pinia stores 创建（auth、task、pomodoro、checkin、report）
- [ ] API 层统一处理与模块化
- [ ] 路由配置与鉴权守卫
- [ ] CSS 迁移完成
- [ ] 工具函数转换完成
- [ ] 本地开发环境测试通过
- [ ] 生产构建测试通过
- [ ] 与后端 API 对接验证
- [ ] 功能完整性测试（逐页面）
- [ ] 数据互通验证（Web 端与 APK 端）
- [ ] 性能优化（包体积、首屏加载时间）
- [ ] 打包发布流程测试

## 8. 关键注意事项

1. **向后兼容**：API 接口保持不变，只改前端框架
2. **渐进式迁移**：可以先重构一个页面，验证流程后再全量扩展
3. **环境变量**：`.env.development`、`.env.production` 管理 API 基础 URL
4. **TypeScript**：充分利用类型检查，减少运行时错误
5. **测试**：每个页面重构后都在浏览器与 APK 中验证
6. **回滚方案**：保留原始 `frontend/` 目录，重构失败可快速切换

## 9. 建议时间表

- D1 上午：项目初始化与基础架构
- D1 下午：组件拆解与 Header、Footer 完成  
- D2-D3：页面组件转换（早上 4 个，下午 4 个）
- D3 下午：状态管理与 API 层
- D4 上午：路由与环境配置
- D4 下午 - D5：全量测试、优化、部署

## 10. 参考资源

- Vue 3 官方文档：https://vuejs.org/
- Vite 官方文档：https://vitejs.dev/
- Pinia 文档：https://pinia.vuejs.org/
- Tailwind CSS：https://tailwindcss.com/
