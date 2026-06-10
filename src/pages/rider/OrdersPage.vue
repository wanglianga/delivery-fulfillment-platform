<template>
  <div class="space-y-6">
    <div class="flex gap-2">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        :class="activeTab === tab.value ? 'bg-accent text-white' : 'bg-white text-text-light hover:bg-gray-50 border border-border'"
        @click="activeTab = tab.value; fetchOrders()"
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
            <span>{{ order.customerName }}</span>
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
            @click.stop="acceptOrder(order.id)"
          >接单</button>
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
import { useOrdersStore } from '@/stores/orders'
import { useAuthStore } from '@/stores/auth'
import StatusBadge from '@/components/StatusBadge.vue'
import { Store, MapPin, Banknote } from 'lucide-vue-next'

const router = useRouter()
const ordersStore = useOrdersStore()
const auth = useAuthStore()

const activeTab = ref('pending')
const loading = ref(false)
const orders = ref<any[]>([])

const tabs: { value: string; label: string; count?: number }[] = [
  { value: 'pending', label: '待接单' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
]

const statusMap: Record<string, string> = {
  pending: 'pending',
  in_progress: 'delivering',
  completed: 'completed',
}

async function fetchOrders() {
  loading.value = true
  try {
    const params: any = { riderId: auth.user?.id }
    if (activeTab.value !== 'completed') {
      if (activeTab.value === 'pending') params.status = 'pending'
      else params.status = 'delivering,picked_up,arrived_store'
    } else {
      params.status = 'completed,signed'
    }
    await ordersStore.fetchOrders(params)
    orders.value = ordersStore.orders
  } finally {
    loading.value = false
  }
}

async function acceptOrder(id: number) {
  await ordersStore.acceptOrder(id)
  await fetchOrders()
}

function goToDelivery(order: any) {
  if (order.status !== 'pending' || order.status === 'completed') {
    router.push(`/rider/delivery/${order.id}`)
  }
}

onMounted(fetchOrders)
</script>
