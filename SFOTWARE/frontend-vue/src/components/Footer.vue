<template>
  <footer class="glass-tab py-2 px-2 sticky bottom-0 z-40 bg-white border-t border-gray-200">
    <div class="container mx-auto flex justify-around items-center md:hidden">
      <router-link to="/todo" 
        :class="{ 'text-blue-600': route.path === '/todo', 'text-gray-500': route.path !== '/todo' }"
        class="tab-item flex flex-col items-center px-2 py-1 rounded-lg hover:bg-gray-100 transition-all">
        <i class="fas fa-list-alt text-lg"></i>
        <span class="text-[10px] mt-0.5">待办</span>
      </router-link>
      
      <router-link to="/calendar" 
        :class="{ 'text-blue-600': route.path === '/calendar', 'text-gray-500': route.path !== '/calendar' }"
        class="tab-item flex flex-col items-center px-2 py-1 rounded-lg hover:bg-gray-100 transition-all">
        <i class="fas fa-calendar text-lg"></i>
        <span class="text-[10px] mt-0.5">日历</span>
      </router-link>

      <router-link to="/pomodoro" 
        :class="{ 'text-blue-600': route.path === '/pomodoro', 'text-gray-500': route.path !== '/pomodoro' }"
        class="tab-item flex flex-col items-center px-2 py-1 rounded-lg hover:bg-gray-100 transition-all">
        <i class="fas fa-clock text-lg"></i>
        <span class="text-[10px] mt-0.5">番茄</span>
      </router-link>

      <router-link to="/report" 
        :class="{ 'text-blue-600': route.path === '/report', 'text-gray-500': route.path !== '/report' }"
        class="tab-item flex flex-col items-center px-2 py-1 rounded-lg hover:bg-gray-100 transition-all">
        <i class="fas fa-chart-line text-lg"></i>
        <span class="text-[10px] mt-0.5">周报</span>
      </router-link>

      <router-link to="/checkin" 
        :class="{ 'text-blue-600': route.path === '/checkin', 'text-gray-500': route.path !== '/checkin' }"
        class="tab-item flex flex-col items-center px-2 py-1 rounded-lg hover:bg-gray-100 transition-all">
        <i class="fas fa-check-circle text-lg"></i>
        <span class="text-[10px] mt-0.5">打卡</span>
      </router-link>

      <router-link to="/profile" 
        :class="{ 'text-blue-600': route.path === '/profile', 'text-gray-500': route.path !== '/profile' }"
        class="tab-item flex flex-col items-center px-2 py-1 rounded-lg hover:bg-gray-100 transition-all">
        <i class="fas fa-user text-lg"></i>
        <span class="text-[10px] mt-0.5">我的</span>
      </router-link>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<style scoped>
.glass-tab {
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.95);
}
</style>
