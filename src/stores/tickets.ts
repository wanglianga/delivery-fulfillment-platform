import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api'

export interface Ticket {
  id: number
  orderId: number
  exceptionId: number
  type: string
  priority: string
  status: string
  responsibility?: string
  resolution?: string
  assignedTo?: number
  createdAt: string
  updatedAt: string
}

export const useTicketsStore = defineStore('tickets', () => {
  const tickets = ref<Ticket[]>([])
  const currentTicket = ref<Ticket | null>(null)
  const loading = ref(false)

  async function fetchTickets(params?: Record<string, any>) {
    loading.value = true
    try {
      const res = await api.get('/tickets', { params })
      tickets.value = res.data
    } finally {
      loading.value = false
    }
  }

  async function fetchTicket(id: number) {
    loading.value = true
    try {
      const res = await api.get(`/tickets/${id}`)
      currentTicket.value = res.data
      return res.data
    } finally {
      loading.value = false
    }
  }

  async function judgeTicket(id: number, responsibility: string, resolution: string) {
    const res = await api.post(`/tickets/${id}/judge`, { responsibility, resolution })
    return res.data
  }

  async function compensateTicket(id: number) {
    const res = await api.post(`/tickets/${id}/compensate`)
    return res.data
  }

  return {
    tickets,
    currentTicket,
    loading,
    fetchTickets,
    fetchTicket,
    judgeTicket,
    compensateTicket,
  }
})
