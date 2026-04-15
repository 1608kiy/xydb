import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as authAPI from '@/api/auth'

interface User {
  id: number
  email: string
  name: string
  avatar?: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))
  const isLoading = ref(false)

  const isLoggedIn = computed(() => !!token.value)

  const login = async (email: string, password: string) => {
    isLoading.value = true
    try {
      const response = await authAPI.login(email, password)
      token.value = response.token
      user.value = response.user
      localStorage.setItem('token', response.token)
    } finally {
      isLoading.value = false
    }
  }

  const logout = () => {
    user.value = null
    token.value = null
    localStorage.removeItem('token')
  }

  const register = async (email: string, name: string, password: string) => {
    isLoading.value = true
    try {
      const response = await authAPI.register(email, name, password)
      token.value = response.token
      user.value = response.user
      localStorage.setItem('token', response.token)
    } finally {
      isLoading.value = false
    }
  }

  return {
    user,
    token,
    isLoading,
    isLoggedIn,
    login,
    logout,
    register
  }
})
