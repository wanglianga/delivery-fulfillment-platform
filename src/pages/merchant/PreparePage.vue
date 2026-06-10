<template>
  <div class="space-y-6">
    <h2 class="text-lg font-semibold text-text">出餐确认</h2>

    <div class="grid grid-cols-2 gap-4">
      <div v-for="order in orders" :key="order.id" class="card">
        <div class="flex items-start justify-between mb-3">
          <div>
            <span class="font-mono text-sm text-text-light">{{ order.orderNo }}</span>
            <StatusBadge :status="order.status" type="order" class="ml-2" />
          </div>
          <span class="text-sm text-text-muted">{{ formatTime(order.createdAt) }}</span>
        </div>

        <div class="space-y-1 text-sm mb-3">
          <div class="flex items-center gap-2">
            <User class="w-4 h-4 text-text-muted" />
            <span>{{ order.customerName }}</span>
          </div>
          <div class="flex items-center gap-2">
            <MapPin class="w-4 h-4 text-text-muted" />
            <span class="text-text-light truncate">{{ order.customerAddress }}</span>
          </div>
        </div>

        <div v-if="order.items?.length" class="bg-bg rounded-lg p-3 mb-3">
          <div v-for="(item, idx) in order.items" :key="idx" class="flex justify-between text-sm py-0.5">
            <span>{{ item.name }} x{{ item.quantity }}</span>
            <span class="text-text-light">¥{{ (item.price * item.quantity).toFixed(2) }}</span>
          </div>
          <div class="flex justify-between text-sm font-semibold pt-2 mt-1 border-t border-border">
            <span>合计</span>
            <span>¥{{ order.totalAmount ?? '-' }}</span>
          </div>
        </div>

        <div class="flex gap-2">
          <button
            v-if="order.status === 'pending' || order.status === 'accepted'"
            class="btn-primary flex-1 text-sm"
            @click="prepareOrder(order.id)"
          >
            <CookingPot class="w-4 h-4 mr-1 inline" /> 开始备餐
          </button>
          <button
            v-if="order.status === 'preparing'"
            class="btn-success flex-1 text-sm"
            @click="readyOrder(order.id)"
          >
            <CheckCircle class="w-4 h-4 mr-1 inline" /> 出餐完成
          </button>
        </div>
      </div>
    </div>

    <div v-if="orders.length === 0 && !loading" class="text-center text-text-muted py-12">
      暂无待处理订单
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useOrdersStore } from '@/stores/orders'
import { useAuthStore } from '@/stores/auth'
import StatusBadge from '@/components/StatusBadge.vue'
import { User, MapPin, CookingPot, CheckCircle } from 'lucide-vue-next'

const ordersStore = useOrdersStore()
const auth = useAuthStore()
const loading = ref(false)
const orders = ref<any[]>([])

function formatTime(dateStr: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

async function fetchOrders() {
  loading.value = true
  try {
    await ordersStore.fetchOrders({ merchantId: auth.user?.merchantId })
    orders.value = ordersStore.orders.filter(
      (o: any) => !['completed', 'signed', 'cancelled'].includes(o.status)
    )
  } finally {
    loading.value = false
  }
}

async function prepareOrder(id: number) {
  await ordersStore.merchantPrepare(id)
  await fetchOrders()
}

async function readyOrder(id: number) {
  await ordersStore.merchantReady(id)
  await fetchOrders()
}

onMounted(fetchOrders)
</script>
