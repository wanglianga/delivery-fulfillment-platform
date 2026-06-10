<template>
  <div class="space-y-6">
    <h2 class="text-lg font-semibold text-text">订单跟踪</h2>

    <DataTable :columns="columns" :data="orders" :loading="loading">
      <template #status="{ row }">
        <StatusBadge :status="row.status" type="order" />
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

onMounted(fetchOrders)
</script>
