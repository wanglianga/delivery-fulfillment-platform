import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api'
import router from '@/router'

export interface User {
  id: number
  username: string
  role: string
  name: string
  stationId?: number
  merchantId?: number
}

const roleHomeMap: Record<string, string> = {
  station: '/station',
  rider: '/rider',
  merchant: '/merchant',
  cs: '/cs',
}

const roleLabels: Record<string, string> = {
  station: '站点管理员',
  rider: '骑手',
  merchant: '商户',
  cs: '客服',
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user = ref<User | null>(null)

  const isLoggedIn = computed(() => !!token.value)
  const userRole = computed(() => user.value?.role || '')
  const userName = computed(() => user.value?.name || '')
  const roleLabel = computed(() => roleLabels[userRole.value] || '')
  const homePath = computed(() => roleHomeMap[userRole.value] || '/login')

  function loadUser() {
    const stored = localStorage.getItem('user')
    if (stored) {
      try {
        user.value = JSON.parse(stored)
      } catch {
        user.value = null
      }
    }
  }

  async function login(username: string, password: string, role?: string) {
    const res = await api.post('/auth/login', { username, password, role })
    token.value = res.data.accessToken
    user.value = res.data.user
    localStorage.setItem('token', res.data.accessToken)
    localStorage.setItem('user', JSON.stringify(res.data.user))
    router.push(roleHomeMap[res.data.user.role] || '/login')
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  async function fetchProfile() {
    try {
      const res = await api.get('/auth/profile')
      user.value = res.data
      localStorage.setItem('user', JSON.stringify(res.data))
    } catch {
      logout()
    }
  }

  function hasRole(...roles: string[]) {
    return roles.includes(userRole.value)
  }

  loadUser()

  return {
    token,
    user,
    isLoggedIn,
    userRole,
    userName,
    roleLabel,
    homePath,
    login,
    logout,
    fetchProfile,
    hasRole,
  }
})
