import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api'

export interface Compensation {
  id: number
  ticketId: number
  orderId: number
  amount: number
  recipient: string
  type: string
  status: string
  reason?: string
  approvedBy?: number
  createdAt: string
  updatedAt: string
}

export const useCompensationsStore = defineStore('compensations', () => {
  const compensations = ref<Compensation[]>([])
  const loading = ref(false)

  async function fetchCompensations(params?: Record<string, any>) {
    loading.value = true
    try {
      const res = await api.get('/compensations', { params })
      compensations.value = res.data
    } finally {
      loading.value = false
    }
  }

  async function approveCompensation(id: number, reason?: string) {
    const res = await api.post(`/compensations/${id}/approve`, { reason })
    return res.data
  }

  async function rejectCompensation(id: number, reason?: string) {
    const res = await api.post(`/compensations/${id}/reject`, { reason })
    return res.data
  }

  return {
    compensations,
    loading,
    fetchCompensations,
    approveCompensation,
    rejectCompensation,
  }
})
