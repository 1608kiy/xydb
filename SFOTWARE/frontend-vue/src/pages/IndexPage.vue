<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 flex items-center justify-center p-4">
    <div class="max-w-md w-full">
      <!-- 卡片容器 -->
      <div class="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-10 border border-white/20">
        <!-- Logo 和标题 -->
        <div class="text-center mb-10">
          <div class="mb-4">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
              <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.5 1.5H5.75A2.25 2.25 0 003.5 3.75v12.5A2.25 2.25 0 005.75 18.5h8.5a2.25 2.25 0 002.25-2.25V10M10.5 1.5v4m0-4a2.5 2.5 0 012.5 2.5M10 14h5m-5-3h5" stroke="currentColor" fill="none" stroke-width="1.5"/>
              </svg>
            </div>
          </div>
          <h1 class="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            铃记
          </h1>
          <p class="text-gray-600 font-medium">高效每一天，番茄钟助力</p>
          <p class="text-sm text-gray-500 mt-2">用心记录，用行动改变</p>
        </div>

        <!-- 功能介绍 -->
        <div class="mb-8 space-y-3">
          <div class="flex items-center gap-3 p-3 rounded-xl bg-blue-50/50">
            <span class="text-lg">✓</span>
            <span class="text-gray-700 text-sm">待办事项 - 任务管理</span>
          </div>
          <div class="flex items-center gap-3 p-3 rounded-xl bg-blue-50/50">
            <span class="text-lg">⏱️</span>
            <span class="text-gray-700 text-sm">番茄钟 - 专注计时</span>
          </div>
          <div class="flex items-center gap-3 p-3 rounded-xl bg-blue-50/50">
            <span class="text-lg">📍</span>
            <span class="text-gray-700 text-sm">打卡 - 习惯养成</span>
          </div>
          <div class="flex items-center gap-3 p-3 rounded-xl bg-blue-50/50">
            <span class="text-lg">📊</span>
            <span class="text-gray-700 text-sm">周报 - 数据统计</span>
          </div>
        </div>

        <!-- 按钮区域 -->
        <div class="space-y-3">
          <router-link to="/login" class="block w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all text-center duration-300 transform hover:scale-105">
            立即登录
          </router-link>
          <router-link to="/register" class="block w-full border-2 border-blue-600 text-blue-600 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-all text-center duration-300">
            新用户注册
          </router-link>
        </div>

        <!-- 底部提示 -->
        <div class="mt-8 pt-6 border-t border-gray-200 text-center">
          <p class="text-xs text-gray-500">💡 一站式效率工具，让你的每一天都充满价值</p>
        </div>
      </div>

      <!-- 装饰元素 -->
      <div class="mt-12 text-center">
        <div class="inline-flex gap-4 text-sm text-gray-600">
          <span>📱 移动友好</span>
          <span>🚀 快速高效</span>
          <span>🔒 安全可靠</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { onMounted } from 'vue'

const authStore = useAuthStore()
const router = useRouter()

onMounted(() => {
  if (authStore.isLoggedIn) {
    router.push('/todo')
  }
})
</script>
