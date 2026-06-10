<template>
  <div class="space-y-6">
    <div class="flex gap-2">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        :class="activeTab === tab.value ? 'bg-accent text-white' : 'bg-white text-text-light hover:bg-gray-50 border border-border'"
        @click="switchTab(tab.value)"
      >
        {{ tab.label }}
        <span v-if="tab.count !== undefined" class="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-white/20">
          {{ tab.count }}
        </span>
      </button>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div
        v-for="order in orders"
        :key="order.id"
        class="card hover:shadow-md transition-shadow cursor-pointer"
        @click="goToDelivery(order)"
      >
        <div class="flex items-start justify-between mb-2">
          <span class="font-mono text-sm text-text-light">{{ order.orderNo }}</span>
          <StatusBadge :status="order.status" type="order" />
        </div>
        <div class="text-sm space-y-1">
          <div class="flex items-center gap-2">
            <Store class="w-4 h-4 text-text-muted" />
            <span>{{ order.merchantName || '-' }}</span>
          </div>
          <div class="flex items-center gap-2">
            <MapPin class="w-4 h-4 text-text-muted" />
            <span class="text-text-light truncate">{{ order.customerAddress }}</span>
          </div>
          <div class="flex items-center gap-2">
            <Banknote class="w-4 h-4 text-text-muted" />
            <span class="font-medium">¥{{ order.totalAmount ?? '-' }}</span>
          </div>
        </div>
        <div v-if="order.status === 'pending'" class="mt-3 flex justify-end">
          <button
            class="btn-primary text-sm px-3 py-1.5"
            :disabled="acceptingOrderId !== null"
            @click.stop="acceptOrder(order.id)"
          >
            {{ acceptingOrderId === order.id ? '接单中...' : '接单' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="orders.length === 0 && !loading" class="text-center text-text-muted py-12">
      暂无订单
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api'
import { useAuthStore } from '@/stores/auth'
import StatusBadge from '@/components/StatusBadge.vue'
import { Store, MapPin, Banknote } from 'lucide-vue-next'

const router = useRouter()
const auth = useAuthStore()

const activeTab = ref('pending')
const loading = ref(false)
const orders = ref<any[]>([])
const acceptingOrderId = ref<number | null>(null)

const tabs = ref([
  { value: 'pending', label: '待接单', count: undefined as number | undefined },
  { value: 'in_progress', label: '进行中', count: undefined as number | undefined },
  { value: 'completed', label: '已完成', count: undefined as number | undefined },
])

async function fetchOrders() {
  loading.value = true
  try {
    const params: Record<string, string> = {}
    const stationId = auth.user?.stationId
    if (stationId) params.stationId = String(stationId)

    if (activeTab.value === 'pending') {
      params.status = 'pending'
      params.riderIdNull = 'true'
    } else if (activeTab.value === 'in_progress') {
      params.status = 'accepted,arrived_store,picked_up,delivering,delivered'
      if (auth.user?.id) params.riderId = String(auth.user.id)
    } else {
      params.status = 'signed'
      if (auth.user?.id) params.riderId = String(auth.user.id)
    }

    const res = await api.get('/orders', { params })
    orders.value = Array.isArray(res.data) ? res.data : []
  } catch {
    orders.value = []
  } finally {
    loading.value = false
  }
}

async function fetchCounts() {
  const stationId = auth.user?.stationId
  const baseParams: Record<string, string> = {}
  if (stationId) baseParams.stationId = String(stationId)

  try {
    const [pendingRes, progressRes, completedRes] = await Promise.all([
      api.get('/orders', { params: { ...baseParams, status: 'pending', riderIdNull: 'true' } }),
      api.get('/orders', { params: { ...baseParams, status: 'accepted,arrived_store,picked_up,delivering,delivered', riderId: String(auth.user?.id) } }),
      api.get('/orders', { params: { ...baseParams, status: 'signed', riderId: String(auth.user?.id) } }),
    ])

    tabs.value[0].count = Array.isArray(pendingRes.data) ? pendingRes.data.length : 0
    tabs.value[1].count = Array.isArray(progressRes.data) ? progressRes.data.length : 0
    tabs.value[2].count = Array.isArray(completedRes.data) ? completedRes.data.length : 0
  } catch {}
}

function switchTab(tab: string) {
  activeTab.value = tab
  fetchOrders()
}

async function acceptOrder(id: number) {
  acceptingOrderId.value = id
  try {
    await api.post(`/orders/${id}/accept`)
    await fetchOrders()
    await fetchCounts()
  } catch (e) {
    console.error('接单失败', e)
  } finally {
    acceptingOrderId.value = null
  }
}

function goToDelivery(order: any) {
  if (order.status !== 'pending') {
    router.push(`/rider/delivery/${order.id}`)
  }
}

onMounted(() => {
  fetchOrders()
  fetchCounts()
})
</script>
