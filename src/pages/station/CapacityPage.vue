<template>
  <div class="space-y-6">
    <div class="grid grid-cols-4 gap-4">
      <StatCard :icon="Users" title="在线骑手" :value="capacity?.onlineRiders ?? '-'" color="blue" />
      <StatCard :icon="Coffee" title="空闲骑手" :value="capacity?.idleRiders ?? '-'" color="green" />
      <StatCard :icon="Bike" title="配送中" :value="capacity?.busyRiders ?? '-'" color="orange" />
      <StatCard :icon="AlertTriangle" title="异常告警" :value="capacity?.alertCount ?? '-'" color="red" />
    </div>

    <div class="card">
      <h2 class="text-lg font-semibold text-text mb-4">骑手状态</h2>
      <DataTable :columns="riderColumns" :data="capacity?.riders ?? []" :loading="stationStore.loading">
        <template #status="{ row }">
          <StatusBadge :status="row.status" type="shift" />
        </template>
      </DataTable>
    </div>

    <div class="card">
      <h2 class="text-lg font-semibold text-text mb-4">最近订单</h2>
      <DataTable :columns="orderColumns" :data="recentOrders" :loading="ordersStore.loading">
        <template #status="{ row }">
          <StatusBadge :status="row.status" type="order" />
        </template>
      </DataTable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useStationStore } from '@/stores/station'
import { useOrdersStore } from '@/stores/orders'
import { useAuthStore } from '@/stores/auth'
import StatCard from '@/components/StatCard.vue'
import DataTable from '@/components/DataTable.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { Users, Coffee, Bike, AlertTriangle } from 'lucide-vue-next'

const stationStore = useStationStore()
const ordersStore = useOrdersStore()
const auth = useAuthStore()

const capacity = computed(() => stationStore.capacity)
const recentOrders = computed(() => ordersStore.orders.slice(0, 20))

const riderColumns = [
  { key: 'name', label: '姓名', sortable: true },
  { key: 'phone', label: '手机号' },
  { key: 'status', label: '状态' },
  { key: 'currentOrders', label: '当前订单', sortable: true },
  { key: 'area', label: '服务区域' },
]

const orderColumns = [
  { key: 'orderNo', label: '订单号', sortable: true },
  { key: 'customerName', label: '客户' },
  { key: 'customerAddress', label: '地址' },
  { key: 'status', label: '状态' },
  { key: 'createdAt', label: '创建时间', sortable: true },
]

onMounted(() => {
  stationStore.fetchCapacity(auth.user?.stationId)
  ordersStore.fetchOrders({ stationId: auth.user?.stationId })
})
</script>
