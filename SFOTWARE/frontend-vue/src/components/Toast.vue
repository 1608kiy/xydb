<template>
  <div v-if="showToast" :class="[
    'fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white font-medium transition-opacity',
    typeClass
  ]">
    {{ message }}
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useToastStore } from '@/stores/toast'

const toastStore = useToastStore()

const currentToast = computed(() => toastStore.toasts[0] ?? null)
const showToast = computed(() => currentToast.value !== null)
const message = computed(() => currentToast.value?.message ?? '')

const typeClass = computed(() => {
  const type = currentToast.value?.type
  return {
    'success': 'bg-green-500',
    'error': 'bg-red-500',
    'warning': 'bg-yellow-500',
    'info': 'bg-blue-500'
  }[type] || 'bg-gray-500'
})
</script>
