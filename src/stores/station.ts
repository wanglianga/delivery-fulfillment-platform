import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api'

export interface CapacityData {
  onlineRiders: number
  idleRiders: number
  busyRiders: number
  alertCount: number
  riders: Array<{
    id: number
    name: string
    phone: string
    status: string
    currentOrders: number
    area: string
  }>
}

export interface HeatmapData {
  areas: Array<{
    name: string
    orderCount: number
    density: number
  }>
}

export const useStationStore = defineStore('station', () => {
  const capacity = ref<CapacityData | null>(null)
  const heatmap = ref<HeatmapData | null>(null)
  const loading = ref(false)

  async function fetchCapacity(stationId?: number) {
    loading.value = true
    try {
      const res = await api.get('/station/capacity', {
        params: stationId ? { stationId } : {},
      })
      capacity.value = res.data
    } finally {
      loading.value = false
    }
  }

  async function fetchHeatmap(stationId?: number, timeRange?: string) {
    loading.value = true
    try {
      const res = await api.get('/station/heatmap', {
        params: { ...(stationId ? { stationId } : {}), ...(timeRange ? { timeRange } : {}) },
      })
      heatmap.value = res.data
    } finally {
      loading.value = false
    }
  }

  return {
    capacity,
    heatmap,
    loading,
    fetchCapacity,
    fetchHeatmap,
  }
})
