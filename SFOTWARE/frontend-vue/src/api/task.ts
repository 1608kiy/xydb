import client from './client'

export interface TaskSubtask {
  id?: number
  title: string
  completed: boolean
}

export interface TaskItem {
  id: number
  title: string
  description?: string
  status: string
  priority?: string
  tags?: string | string[]
  dueAt?: string | null
  createdAt?: string
  updatedAt?: string
  subtasks?: TaskSubtask[]
  completed: boolean
  dueDate?: string | null
}

export interface TaskPayload {
  title: string
  description?: string
  status?: string
  priority?: string
  tags?: string
  dueAt?: string | null
  autoClassify?: boolean
  autoBreakdown?: boolean
}

interface ApiResult<T> {
  code: number
  message: string
  data: T
}

interface TaskAutomationResult {
  task: TaskItem
  message?: string
}

const unwrap = async <T>(promise: Promise<ApiResult<T>>): Promise<T> => {
  const result = await promise
  return result.data
}

const normalizeTask = (task: any): TaskItem => {
  const item = { ...(task || {}) } as TaskItem
  item.status = item.status || (item.completed ? 'completed' : 'pending')
  item.completed = item.status === 'completed'
  item.dueDate = item.dueAt || item.dueDate || null
  item.subtasks = Array.isArray(item.subtasks) ? item.subtasks : []
  return item
}

const normalizeTaskList = (payload: any): TaskItem[] => {
  let list = payload
  if (!Array.isArray(list)) {
    if (payload && Array.isArray(payload.records)) list = payload.records
    else if (payload && Array.isArray(payload.list)) list = payload.list
    else list = []
  }
  return list.map(normalizeTask)
}

const buildTaskPayload = (payload: TaskPayload) => ({
  title: payload.title,
  description: payload.description || '',
  status: payload.status || 'pending',
  priority: payload.priority || 'medium',
  tags: payload.tags,
  dueAt: payload.dueAt || null
})

export const getTasks = async () => {
  const data = await unwrap(client.get('/api/tasks') as Promise<ApiResult<any>>)
  return normalizeTaskList(data)
}

export const getTask = async (id: number) => {
  const data = await unwrap(client.get(`/api/tasks/${id}`) as Promise<ApiResult<any>>)
  return normalizeTask(data)
}

export const createTask = async (payload: TaskPayload) => {
  const data = await unwrap(client.post('/api/tasks', buildTaskPayload(payload)) as Promise<ApiResult<any>>)
  return normalizeTask(data)
}

export const autoCreateTask = async (payload: TaskPayload) => {
  const data = await unwrap(client.post('/api/tasks/auto-create', {
    ...buildTaskPayload(payload),
    autoClassify: payload.autoClassify !== false,
    autoBreakdown: payload.autoBreakdown !== false
  }) as Promise<ApiResult<TaskAutomationResult>>)
  return normalizeTask(data.task)
}

export const updateTask = async (id: number, data: Partial<TaskPayload>) => {
  const result = await unwrap(client.put(`/api/tasks/${id}`, data) as Promise<ApiResult<any>>)
  return normalizeTask(result)
}

export const autoPlanTask = async (id: number, data: Partial<TaskPayload>) => {
  const result = await unwrap(client.post(`/api/tasks/${id}/auto-plan`, {
    ...data,
    autoClassify: data.autoClassify !== false,
    autoBreakdown: data.autoBreakdown !== false
  }) as Promise<ApiResult<TaskAutomationResult>>)
  return normalizeTask(result.task)
}

export const deleteTask = (id: number) =>
  client.delete(`/api/tasks/${id}`) as Promise<void>
