<template>
  <div class="bg-white rounded-lg p-6 border border-gray-200">
    <h3 class="text-xl font-bold mb-4">本周统计</h3>
    <div class="space-y-3">
      <div class="flex justify-between items-center">
        <span class="text-gray-600">完成任务</span>
        <span class="text-2xl font-bold text-blue-600">{{ stats.completedTasks }}</span>
      </div>
      <div class="flex justify-between items-center">
        <span class="text-gray-600">专注时间</span>
        <span class="text-2xl font-bold text-green-600">{{ stats.focusTime }}h</span>
      </div>
      <div class="flex justify-between items-center">
        <span class="text-gray-600">打卡次数</span>
        <span class="text-2xl font-bold text-red-600">{{ stats.checkinDays }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  stats: {
    type: Object,
    default: () => ({
      completedTasks: 0,
      focusTime: 0,
      checkinDays: 0
    })
  }
})
</script>
