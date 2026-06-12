import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api'

export interface WeatherAffectedItem {
  type: string
  level: string
  delayMinutes: number
  text?: string
}

export interface SlowPrepareRecord {
  flaggedAt: string
  waitingMinutes: number
  scoreImpact?: number
  note?: string
}

export interface Order {
  id: number
  orderNo: string
  status: string
  stationId: number
  merchantId: number
  merchantName?: string
  riderId?: number
  riderName?: string
  customerName: string
  customerAddress: string
  customerPhone?: string
  items?: Array<{ name: string; quantity: number; price: number }>
  totalAmount?: number
  deliveryFee?: number
  estimatedDeliveryTime?: string
  weatherAffected?: WeatherAffectedItem[]
  slowPrepareFlag?: number
  slowPrepareRecord?: SlowPrepareRecord
  reassignRecords?: any[]
  addressChangeRecords?: any[]
  originalCustomerAddress?: string
  addressChangeExtraDistance?: number
  addressChangeExtraFee?: number
  addressChangeOutOfArea?: number
  createdAt: string
  updatedAt: string
}

export const useOrdersStore = defineStore('orders', () => {
  const orders = ref<Order[]>([])
  const currentOrder = ref<Order | null>(null)
  const loading = ref(false)

  async function fetchOrders(params?: Record<string, any>) {
    loading.value = true
    try {
      const res = await api.get('/orders', { params })
      orders.value = res.data
    } finally {
      loading.value = false
    }
  }

  async function fetchOrder(id: number) {
    loading.value = true
    try {
      const res = await api.get(`/orders/${id}`)
      currentOrder.value = res.data
      return res.data
    } finally {
      loading.value = false
    }
  }

  async function acceptOrder(id: number) {
    const res = await api.post(`/orders/${id}/accept`)
    return res.data
  }

  async function arriveStore(id: number) {
    const res = await api.post(`/orders/${id}/arrive-store`)
    return res.data
  }

  async function pickUp(id: number) {
    const res = await api.post(`/orders/${id}/pick-up`)
    return res.data
  }

  async function deliver(id: number) {
    const res = await api.post(`/orders/${id}/deliver`)
    return res.data
  }

  async function deliverPhoto(id: number, file: File) {
    const formData = new FormData()
    formData.append('photo', file)
    const res = await api.post(`/orders/${id}/deliver-photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  }

  async function sign(id: number) {
    const res = await api.post(`/orders/${id}/sign`)
    return res.data
  }

  async function merchantPrepare(id: number) {
    const res = await api.post(`/orders/${id}/merchant-prepare`)
    return res.data
  }

  async function merchantReady(id: number) {
    const res = await api.post(`/orders/${id}/merchant-ready`)
    return res.data
  }

  async function reportAccident(id: number, data: { accidentType: string; description: string; photos?: string[] }) {
    const res = await api.post(`/orders/${id}/report-accident`, data)
    return res.data
  }

  async function findNearbyRiders(id: number) {
    const res = await api.get(`/orders/${id}/nearby-riders`)
    return res.data
  }

  async function reassignOrder(id: number, data: { newRiderId: number; responsibilitySplit?: { originalRider: number; newRider: number; platform: number } }) {
    const res = await api.post(`/orders/${id}/reassign`, data)
    return res.data
  }

  async function fetchReassigningOrders(stationId?: number) {
    const params: Record<string, string> = {}
    if (stationId) params.stationId = String(stationId)
    const res = await api.get('/orders/reassigning', { params })
    return res.data
  }

  async function requestAddressChange(id: number, newAddress: string) {
    const res = await api.post(`/orders/${id}/request-address-change`, { newAddress })
    return res.data
  }

  async function confirmAddressChange(id: number) {
    const res = await api.post(`/orders/${id}/confirm-address-change`)
    return res.data
  }

  async function rejectAddressChange(id: number, reason: string) {
    const res = await api.post(`/orders/${id}/reject-address-change`, { reason })
    return res.data
  }

  return {
    orders,
    currentOrder,
    loading,
    fetchOrders,
    fetchOrder,
    acceptOrder,
    arriveStore,
    pickUp,
    deliver,
    deliverPhoto,
    sign,
    merchantPrepare,
    merchantReady,
    reportAccident,
    findNearbyRiders,
    reassignOrder,
    fetchReassigningOrders,
    requestAddressChange,
    confirmAddressChange,
    rejectAddressChange,
  }
})
