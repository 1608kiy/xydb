<template>
  <header class="bg-white shadow-sm sticky top-0 z-30">
    <div class="container mx-auto px-4 py-3 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <router-link to="/" class="text-primary text-lg font-bold">
          <i class="fas fa-ring"></i> 铃记
        </router-link>
        <span class="text-xs text-gray-500">高效每一天</span>
      </div>

      <nav class="hidden md:flex items-center gap-6">
        <router-link to="/todo" 
          :class="{ 'text-primary font-semibold': route.path === '/todo', 'text-gray-600 hover:text-primary': route.path !== '/todo' }">
          待办
        </router-link>
        <router-link to="/calendar" 
          :class="{ 'text-primary font-semibold': route.path === '/calendar', 'text-gray-600 hover:text-primary': route.path !== '/calendar' }">
          日历
        </router-link>
        <router-link to="/pomodoro" 
          :class="{ 'text-primary font-semibold': route.path === '/pomodoro', 'text-gray-600 hover:text-primary': route.path !== '/pomodoro' }">
          番茄
        </router-link>
        <router-link to="/report" 
          :class="{ 'text-primary font-semibold': route.path === '/report', 'text-gray-600 hover:text-primary': route.path !== '/report' }">
          周报
        </router-link>
        <router-link to="/checkin" 
          :class="{ 'text-primary font-semibold': route.path === '/checkin', 'text-gray-600 hover:text-primary': route.path !== '/checkin' }">
          打卡
        </router-link>
      </nav>

      <div v-if="authStore.isLoggedIn" class="flex items-center gap-4">
        <div class="relative group">
          <button class="flex items-center gap-2 focus:outline-none">
            <img v-if="authStore.user?.avatar" :src="authStore.user.avatar" :alt="authStore.user.name" class="w-8 h-8 rounded-full border border-gray-200" />
            <i v-else class="fas fa-user-circle text-2xl text-gray-400"></i>
            <span class="hidden md:inline text-sm">{{ authStore.user?.name || '用户' }}</span>
            <i class="fas fa-chevron-down text-gray-500"></i>
          </button>

          <div class="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg p-2 hidden group-hover:block">
            <router-link to="/profile" class="block px-2 py-1 text-sm text-gray-700 hover:bg-gray-100">个人中心</router-link>
            <button @click="handleLogout" class="w-full text-left px-2 py-1 text-sm text-gray-700 hover:bg-gray-100">退出登录</button>
          </div>
        </div>
      </div>

      <div v-else class="flex items-center gap-2">
        <router-link to="/login" class="px-4 py-2 text-sm text-gray-600 hover:text-primary">登录</router-link>
        <router-link to="/register" class="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90">注册</router-link>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.text-primary {
  @apply text-blue-600;
}

.bg-primary {
  @apply bg-blue-600;
}
</style>
