import client from './client'

export interface TaskItem {
  id: number
  title: string
  description?: string
  completed: boolean
  createdAt: string
  dueDate?: string
}

export const getTasks = () => client.get('/api/tasks') as Promise<TaskItem[]>

export const createTask = (title: string, description?: string) =>
  client.post('/api/tasks', { title, description }) as Promise<TaskItem>

export const updateTask = (id: number, data: any) =>
  client.put(`/api/tasks/${id}`, data) as Promise<TaskItem>

export const deleteTask = (id: number) =>
  client.delete(`/api/tasks/${id}`) as Promise<void>

export const getTask = (id: number) =>
  client.get(`/api/tasks/${id}`) as Promise<TaskItem>
