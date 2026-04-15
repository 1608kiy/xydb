import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as taskAPI from '@/api/task'

interface Task {
  id: number
  title: string
  description?: string
  completed: boolean
  createdAt: string
  dueDate?: string
}

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

  const addTask = async (title: string, description?: string) => {
    const newTask = await taskAPI.createTask(title, description)
    tasks.value.push(newTask)
    return newTask
  }

  const updateTask = async (id: number, updates: any) => {
    await taskAPI.updateTask(id, updates)
    const task = tasks.value.find(t => t.id === id)
    if (task) {
      Object.assign(task, updates)
    }
  }

  const deleteTask = async (id: number) => {
    await taskAPI.deleteTask(id)
    tasks.value = tasks.value.filter(t => t.id !== id)
  }

  const toggleTask = async (id: number) => {
    const task = tasks.value.find(t => t.id === id)
    if (task) {
      await updateTask(id, { completed: !task.completed })
    }
  }

  return {
    tasks,
    loading,
    fetchTasks,
    addTask,
    updateTask,
    deleteTask,
    toggleTask
  }
})
