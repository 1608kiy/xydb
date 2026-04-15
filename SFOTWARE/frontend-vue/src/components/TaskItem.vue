<template>
  <div class="task-card glass-strong rounded-2xl p-4 flex items-center gap-3" :class="{ completed: task.completed }">
    <input :checked="task.completed" @change="$emit('toggle')" type="checkbox" class="w-5 h-5 text-indigo-600 cursor-pointer" />
    <div class="flex-1">
      <h3 :class="{ 'line-through text-gray-400': task.completed }" class="font-semibold text-gray-800">{{ task.title }}</h3>
      <p v-if="task.description" class="text-sm text-gray-500 mt-1">{{ task.description }}</p>
      <p v-if="task.dueDate" class="text-xs text-gray-400 mt-1">截止：{{ formatDate(task.dueDate) }}</p>
    </div>
    <div class="task-actions">
      <button @click="$emit('edit')" class="task-action-btn copy" title="编辑任务" aria-label="编辑任务">
        <i class="fas fa-edit"></i>
      </button>
      <button @click="$emit('delete')" class="task-action-btn delete" title="删除任务" aria-label="删除任务">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  task: {
    type: Object,
    required: true
  }
})

defineEmits(['toggle', 'edit', 'delete'])

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('zh-CN')
}
</script>
