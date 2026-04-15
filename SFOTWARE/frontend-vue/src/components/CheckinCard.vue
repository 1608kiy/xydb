<template>
  <div class="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg p-4 text-white">
    <div class="flex items-center gap-3">
      <div class="text-3xl">📍</div>
      <div class="flex-1">
        <p class="font-bold">{{ checkin.date }}</p>
        <p class="text-sm opacity-90">{{ checkin.time }}</p>
      </div>
      <div class="text-right">
        <p class="text-2xl font-bold">{{ checkin.streak }}</p>
        <p class="text-xs opacity-90">连续天数</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  checkin: {
    type: Object,
    required: true
  }
})
</script>
