<template>
  <div class="bg-white rounded-lg p-6 border border-gray-200 text-center">
    <div class="text-6xl font-bold text-blue-600 mb-4 font-mono">{{ minutes }}:{{ seconds }}</div>
    <p class="text-gray-600 mb-4">{{ isRunning ? '进行中...' : '已暂停' }}</p>
    <div class="flex gap-4 justify-center">
      <button @click="toggleTimer" :class="{ 'bg-red-600': isRunning, 'bg-blue-600': !isRunning }" class="px-6 py-2 text-white rounded-lg hover:opacity-90">
        {{ isRunning ? '暂停' : '开始' }}
      </button>
      <button @click="resetTimer" class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">重置</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'

const duration = ref(25 * 60) // 25 minutes
const remaining = ref(duration.value)
const isRunning = ref(false)
let intervalId: number | null = null

const minutes = computed(() => String(Math.floor(remaining.value / 60)).padStart(2, '0'))
const seconds = computed(() => String(remaining.value % 60).padStart(2, '0'))

const toggleTimer = () => {
  if (isRunning.value) {
    if (intervalId !== null) clearInterval(intervalId)
    isRunning.value = false
  } else {
    isRunning.value = true
    intervalId = window.setInterval(() => {
      if (remaining.value > 0) {
        remaining.value--
      } else {
        if (intervalId !== null) clearInterval(intervalId)
        isRunning.value = false
      }
    }, 1000)
  }
}

const resetTimer = () => {
  if (intervalId !== null) clearInterval(intervalId)
  isRunning.value = false
  remaining.value = duration.value
}

onBeforeUnmount(() => {
  if (intervalId !== null) clearInterval(intervalId)
})
</script>
