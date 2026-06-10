<template>
  <div class="space-y-6">
    <h2 class="text-lg font-semibold text-text">订单跟踪</h2>

    <DataTable :columns="columns" :data="orders" :loading="loading">
      <template #status="{ row }">
        <div class="space-y-1">
          <StatusBadge :status="row.status" type="order" />
          <div v-if="row.weatherAffected?.length || row.slowPrepareFlag === 1 || row.slowPrepareRecord" class="flex flex-wrap gap-1 mt-1">
            <StatusBadge
              v-for="(w, idx) in row.weatherAffected"
              :key="`weather-${idx}`"
              :status="formatWeatherLabel(w)"
              type="weather-affected"
            />
            <StatusBadge
              v-if="row.slowPrepareFlag === 1 || row.slowPrepareRecord"
              :status="formatSlowPrepareLabel(row)"
              type="slow-prepare"
            />
          </div>
        </div>
      </template>
      <template #slowAlert="{ row }">
        <div v-if="row.slowPrepareFlag === 1 || row.slowPrepareRecord" class="text-xs text-red-600">
          <span>等待 {{ row.slowPrepareRecord?.waitingMinutes ?? 12 }} 分钟</span>
          <span v-if="row.slowPrepareRecord?.scoreImpact" class="ml-1">(-{{ row.slowPrepareRecord.scoreImpact }}分)</span>
        </div>
        <span v-else class="text-text-muted text-xs">-</span>
      </template>
      <template #actions="{ row }">
        <button class="text-info hover:underline text-sm" @click="viewDetail(row)">查看详情</button>
      </template>
    </DataTable>

    <Modal :show="showDetail" title="订单跟踪详情" @close="showDetail = false">
      <div v-if="selectedOrder" class="space-y-4">
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span class="text-text-light">订单号:</span>
            <span class="ml-2 font-medium">{{ selectedOrder.orderNo }}</span>
          </div>
          <div>
            <span class="text-text-light">状态:</span>
            <StatusBadge :status="selectedOrder.status" type="order" class="ml-2" />
          </div>
          <div>
            <span class="text-text-light">客户:</span>
            <span class="ml-2">{{ selectedOrder.customerName }}</span>
          </div>
          <div>
            <span class="text-text-light">金额:</span>
            <span class="ml-2">¥{{ selectedOrder.totalAmount ?? '-' }}</span>
          </div>
        </div>

        <div v-if="selectedOrder.weatherAffected?.length || selectedOrder.slowPrepareFlag === 1 || selectedOrder.slowPrepareRecord" class="space-y-2">
          <h4 class="text-sm font-medium text-text">影响因素</h4>
          <div class="flex flex-wrap gap-1">
            <StatusBadge
              v-for="(w, idx) in selectedOrder.weatherAffected"
              :key="`weather-${idx}`"
              :status="formatWeatherLabel(w)"
              type="weather-affected"
            />
            <StatusBadge
              v-if="selectedOrder.slowPrepareFlag === 1 || selectedOrder.slowPrepareRecord"
              :status="formatSlowPrepareLabel(selectedOrder)"
              type="slow-prepare"
            />
          </div>
          <div v-if="selectedOrder.slowPrepareFlag === 1 || selectedOrder.slowPrepareRecord" class="text-xs text-red-600 bg-red-50 rounded px-2 py-1.5">
            <span>等待时长：{{ selectedOrder.slowPrepareRecord?.waitingMinutes ?? 12 }} 分钟</span>
            <span v-if="selectedOrder.slowPrepareRecord?.scoreImpact" class="ml-2">
              · 影响商户分数：-{{ selectedOrder.slowPrepareRecord.scoreImpact }} 分
            </span>
          </div>
        </div>

        <div class="border-t border-border pt-4">
          <h4 class="text-sm font-medium text-text mb-3">配送进度</h4>
          <StepProgress :currentStep="currentStepIndex" :steps="deliverySteps" />
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useOrdersStore } from '@/stores/orders'
import { useAuthStore } from '@/stores/auth'
import DataTable from '@/components/DataTable.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import StepProgress from '@/components/StepProgress.vue'
import Modal from '@/components/Modal.vue'

const ordersStore = useOrdersStore()
const auth = useAuthStore()
const loading = ref(false)
const orders = ref<any[]>([])
const showDetail = ref(false)
const selectedOrder = ref<any>(null)

const columns = [
  { key: 'orderNo', label: '订单号', sortable: true },
  { key: 'customerName', label: '客户' },
  { key: 'customerAddress', label: '地址' },
  { key: 'totalAmount', label: '金额', sortable: true },
  { key: 'status', label: '状态' },
  { key: 'slowAlert', label: '出餐提醒' },
  { key: 'createdAt', label: '创建时间', sortable: true },
  { key: 'actions', label: '操作' },
]

const deliverySteps = ['已接单', '到店', '取货', '配送', '签收']

const stepIndexMap: Record<string, number> = {
  pending: 0,
  accepted: 0,
  arrived_store: 1,
  picked_up: 2,
  delivering: 3,
  deliver_photo: 3,
  signed: 4,
  completed: 4,
}

const currentStepIndex = computed(() => stepIndexMap[selectedOrder.value?.status || ''] ?? 0)

function viewDetail(order: any) {
  selectedOrder.value = order
  showDetail.value = true
}

async function fetchOrders() {
  loading.value = true
  try {
    await ordersStore.fetchOrders({ merchantId: auth.user?.merchantId })
    orders.value = ordersStore.orders
  } finally {
    loading.value = false
  }
}

function formatWeatherLabel(w: any) {
  const text = w.text || `${w.type}${w.level}`
  return `${text}+${w.delayMinutes}min`
}

function formatSlowPrepareLabel(order: any) {
  const waiting = order.slowPrepareRecord?.waitingMinutes ?? 12
  return `出餐慢 ${waiting}min`
}

onMounted(fetchOrders)
</script>
