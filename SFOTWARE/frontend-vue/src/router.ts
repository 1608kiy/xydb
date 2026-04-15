import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    component: () => import('@/pages/LoginPage.vue')
  },
  {
    path: '/register',
    component: () => import('@/pages/RegisterPage.vue')
  },
  {
    path: '/todo',
    component: () => import('@/pages/TodoPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/calendar',
    component: () => import('@/pages/CalendarPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/pomodoro',
    component: () => import('@/pages/PomodoroPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/report',
    component: () => import('@/pages/ReportPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/checkin',
    component: () => import('@/pages/CheckinPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    component: () => import('@/pages/ProfilePage.vue'),
    meta: { requiresAuth: true }
  }
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
  } else if ((to.path === '/login' || to.path === '/register') && authStore.isLoggedIn) {
    next('/todo')
  } else {
    next()
  }
})

export default router
