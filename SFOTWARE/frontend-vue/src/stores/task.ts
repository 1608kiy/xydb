import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as taskAPI from '@/api/task'

type Task = taskAPI.TaskItem
type TaskPayload = taskAPI.TaskPayload

export const useTaskStore = defineStore('task', () => {
  const tasks = ref<Task[]>([])
  const loading = ref(false)

  const fetchTasks = async () => {
    loading.value = true
    try {
      tasks.value = await taskAPI.getTasks()
    } finally {
      loading.value = false
    }
  }

  const addTask = async (titleOrPayload: string | TaskPayload, description?: string) => {
    const payload = typeof titleOrPayload === 'string'
      ? { title: titleOrPayload, description }
      : titleOrPayload

    const newTask = payload.autoClassify || payload.autoBreakdown
      ? await taskAPI.autoCreateTask(payload)
      : await taskAPI.createTask(payload)

    tasks.value.push(newTask)
    return newTask
  }

  const updateTask = async (id: number, updates: Partial<TaskPayload>) => {
    const updated = await taskAPI.updateTask(id, updates)
    const index = tasks.value.findIndex(task => task.id === id)
    if (index >= 0) {
      tasks.value[index] = updated
    }
    return updated
  }

  const autoPlanTask = async (id: number, updates: Partial<TaskPayload>) => {
    const updated = await taskAPI.autoPlanTask(id, updates)
    const index = tasks.value.findIndex(task => task.id === id)
    if (index >= 0) {
      tasks.value[index] = updated
    }
    return updated
  }

  const deleteTask = async (id: number) => {
    await taskAPI.deleteTask(id)
    tasks.value = tasks.value.filter(task => task.id !== id)
  }

  const toggleTask = async (id: number) => {
    const task = tasks.value.find(item => item.id === id)
    if (!task) return

    const nextStatus = task.status === 'completed' ? 'pending' : 'completed'
    await updateTask(id, { status: nextStatus })
  }

  return {
    tasks,
    loading,
    fetchTasks,
    addTask,
    updateTask,
    autoPlanTask,
    deleteTask,
    toggleTask
  }
})
