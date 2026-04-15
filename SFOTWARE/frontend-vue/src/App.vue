<template>
  <div id="app" class="min-h-screen w-full">
    <router-view />
    <Toast />
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { onMounted } from 'vue'
import Toast from '@/components/Toast.vue'

const authStore = useAuthStore()

onMounted(() => {
  // 检查是否有保存的 token
  if (authStore.token && !authStore.user) {
    // 可以在这里恢复用户信息
  }
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f9fafb;
  color: #1f2937;
}
</style>
