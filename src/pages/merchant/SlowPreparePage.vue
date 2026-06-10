<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-text">出餐慢记录</h2>
      <div class="flex items-center gap-3">
        <div class="flex gap-1 text-sm">
          <span class="text-text-light">共 {{ slowRecords.length }} 条记录</span>
          <span class="text-text-muted">|</span>
          <span class="text-yellow-600">待确认 {{ pendingCount }} 条</span>
          <span class="text-text-muted">|</span>
          <span class="text-success">已确认 {{ confirmedCount }} 条</span>
        </div>
      </div>
    </div>

    <DataTable :columns="columns" :data="slowRecords" :loading="loading">
      <template #arrivedStoreAt="{ row }">
        {{ formatTime(row.arrivedStoreAt) }}
      </template>
      <template #merchantConfirmedAt="{ row }">
        {{ formatTime(row.merchantConfirmedAt) }}
      </template>
      <template #pickedUpAt="{ row }">
        {{ formatTime(row.pickedUpAt) }}
      </template>
      <template #waitSeconds="{ row }">
        <span :class="row.waitSeconds > row.thresholdSeconds ? 'text-danger font-medium' : ''">
          {{ row.waitSeconds }}s
        </span>
      </template>
      <template #thresholdSeconds="{ row }">
        {{ row.thresholdSeconds }}s
      </template>
      <template #isOver="{ row }">
        <span :class="row.waitSeconds > row.thresholdSeconds ? 'text-danger' : 'text-success'">
          {{ row.waitSeconds > row.thresholdSeconds ? '是' : '否' }}
        </span>
      </template>
      <template #impactScore="{ row }">
        <span class="text-danger">-{{ row.impactScore }}</span>
      </template>
      <template #status="{ row }">
        <span :class="getSlowStatusClass(row.status)">
          {{ getSlowStatusLabel(row.status) }}
        </span>
      </template>
      <template #actions="{ row }">
        <div class="flex gap-2">
          <button
            v-if="row.status === 'pending'"
            class="text-info hover:underline text-sm"
            @click="appealRecord(row.id)"
          >发起申诉</button>
          <button
            v-else-if="row.status === 'confirmed'"
            class="text-info hover:underline text-sm"
            @click="appealRecord(row.id)"
          >发起申诉</button>
          <span v-else class="text-text-muted text-xs">-</span>
        </div>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '@/api'
import { useAuthStore } from '@/stores/auth'
import DataTable from '@/components/DataTable.vue'

const auth = useAuthStore()
const slowRecords = ref<any[]>([])
const loading = ref(false)

const columns = [
  { key: 'id', label: '记录ID', sortable: true },
  { key: 'orderNo', label: '订单ID' },
  { key: 'arrivedStoreAt', label: '到店时间' },
  { key: 'merchantConfirmedAt', label: '确认时间' },
  { key: 'pickedUpAt', label: '取货时间' },
  { key: 'waitSeconds', label: '等待秒数' },
  { key: 'thresholdSeconds', label: '阈值秒数' },
  { key: 'isOver', label: '是否超标' },
  { key: 'impactScore', label: '影响分数' },
  { key: 'status', label: '状态' },
  { key: 'actions', label: '操作' },
]

const pendingCount = computed(() => slowRecords.value.filter((r) => r.status === 'pending').length)
const confirmedCount = computed(() => slowRecords.value.filter((r) => r.status === 'confirmed').length)

function getSlowStatusClass(status: string) {
  const map: Record<string, string> = {
    confirmed: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800',
    pending: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800',
    appealed: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800',
    ignored: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600',
  }
  return map[status] || map.ignored
}

function getSlowStatusLabel(status: string) {
  const map: Record<string, string> = {
    confirmed: '已确认',
    pending: '待确认',
    appealed: '已申诉',
    ignored: '已忽略',
  }
  return map[status] || status
}

function formatTime(time: string) {
  if (!time) return '-'
  return new Date(time).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

async function fetchSlowRecords() {
  loading.value = true
  try {
    const params: any = {}
    if (auth.user?.merchantId) {
      params.merchantId = auth.user.merchantId
    }
    const res = await api.get('/merchant-performance/slow-records', { params })
    slowRecords.value = res.data || []
  } finally {
    loading.value = false
  }
}

async function appealRecord(id: number) {
  if (!confirm('确认对此出餐慢记录发起申诉？')) return
  try {
    await api.post(`/merchant-performance/slow-records/${id}/appeal`)
    await fetchSlowRecords()
  } catch (e: any) {
    alert(e.response?.data?.message || '申诉失败')
  }
}

onMounted(fetchSlowRecords)
</script>
