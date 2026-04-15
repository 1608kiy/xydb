import client from './client'

interface AuthUser {
  id: number
  email: string
  name: string
  avatar?: string
}

interface AuthResponse {
  token: string
  user: AuthUser
}

export const login = (email: string, password: string) =>
  client.post('/api/auth/login', { email, password }) as Promise<AuthResponse>

export const register = (email: string, name: string, password: string) =>
  client.post('/api/auth/register', { email, name, password }) as Promise<AuthResponse>

export const logout = () => client.post('/api/auth/logout') as Promise<void>

export const getCurrentUser = () => client.get('/api/auth/me') as Promise<AuthUser>
