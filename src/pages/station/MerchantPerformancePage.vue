<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <label class="text-sm text-text-light">选择站点</label>
        <select v-model="selectedStationId" class="select-field w-auto" @change="fetchData">
          <option value="">全部站点</option>
          <option v-for="s in stations" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
      </div>
    </div>

    <div class="flex border-b border-border">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px"
        :class="activeTab === tab.key
          ? 'border-accent text-accent'
          : 'border-transparent text-text-light hover:text-text'"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <template v-if="activeTab === 'score'">
      <DataTable :columns="scoreColumns" :data="performances" :loading="loading">
        <template #score="{ row }">
          <span
            class="font-semibold"
            :class="getScoreClass(row.score)"
          >{{ row.score }}</span>
        </template>
        <template #onTimeRate="{ row }">
          {{ (row.onTimeRate * 100).toFixed(1) }}%
        </template>
        <template #avgPrepareSeconds="{ row }">
          {{ row.avgPrepareSeconds }}s
        </template>
      </DataTable>
    </template>

    <template v-else>
      <DataTable :columns="slowColumns" :data="slowRecords" :loading="loading">
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
              class="text-success hover:underline text-sm"
              @click="confirmRecord(row.id)"
            >确认</button>
            <button
              v-if="row.status === 'pending' || row.status === 'confirmed'"
              class="text-info hover:underline text-sm"
              @click="appealRecord(row.id)"
            >申诉</button>
          </div>
        </template>
      </DataTable>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import api from '@/api'
import { useAuthStore } from '@/stores/auth'
import DataTable from '@/components/DataTable.vue'

const auth = useAuthStore()
const performances = ref<any[]>([])
const slowRecords = ref<any[]>([])
const stations = ref<any[]>([])
const loading = ref(false)
const activeTab = ref<'score' | 'slow'>('score')
const selectedStationId = ref<string>('')

const tabs = [
  { key: 'score' as const, label: '履约评分' },
  { key: 'slow' as const, label: '出餐慢记录' },
]

const scoreColumns = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'merchantName', label: '商户名', sortable: true },
  { key: 'score', label: '分数', sortable: true },
  { key: 'totalOrders', label: '总订单数', sortable: true },
  { key: 'slowPrepareCount', label: '出餐慢次数', sortable: true },
  { key: 'onTimeRate', label: '准时率', sortable: true },
  { key: 'avgPrepareSeconds', label: '平均出餐秒数', sortable: true },
]

const slowColumns = [
  { key: 'id', label: '记录ID', sortable: true },
  { key: 'orderNo', label: '订单ID' },
  { key: 'merchantName', label: '商户名' },
  { key: 'arrivedStoreAt', label: '到店时间' },
  { key: 'merchantConfirmedAt', label: '商户确认时间' },
  { key: 'pickedUpAt', label: '取货时间' },
  { key: 'waitSeconds', label: '等待秒数' },
  { key: 'thresholdSeconds', label: '阈值秒数' },
  { key: 'isOver', label: '是否超标' },
  { key: 'impactScore', label: '影响分数' },
  { key: 'status', label: '状态' },
  { key: 'actions', label: '操作' },
]

function getScoreClass(score: number) {
  if (score >= 95) return 'text-success'
  if (score >= 85) return 'text-yellow-600'
  return 'text-danger'
}

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

async function fetchStations() {
  try {
    const res = await api.get('/station')
    stations.value = res.data || []
    if (auth.user?.stationId && !selectedStationId.value) {
      selectedStationId.value = String(auth.user.stationId)
    }
  } catch {}
}

async function fetchPerformances() {
  loading.value = true
  try {
    const params: any = {}
    if (selectedStationId.value) {
      params.stationId = selectedStationId.value
    }
    const res = await api.get('/merchant-performance', { params })
    performances.value = res.data || []
  } finally {
    loading.value = false
  }
}

async function fetchSlowRecords() {
  loading.value = true
  try {
    const res = await api.get('/merchant-performance/slow-records')
    let records = res.data || []
    if (selectedStationId.value) {
      records = records.filter((r: any) => String(r.stationId) === selectedStationId.value)
    }
    slowRecords.value = records
  } finally {
    loading.value = false
  }
}

async function fetchData() {
  if (activeTab.value === 'score') {
    await fetchPerformances()
  } else {
    await fetchSlowRecords()
  }
}

async function confirmRecord(id: number) {
  if (!confirm('确认此出餐慢记录？确认后将扣除商户分数。')) return
  try {
    await api.post(`/merchant-performance/slow-records/${id}/confirm`)
    await fetchSlowRecords()
    if (activeTab.value === 'score') {
      await fetchPerformances()
    }
  } catch (e: any) {
    alert(e.response?.data?.message || '操作失败')
  }
}

async function appealRecord(id: number) {
  if (!confirm('确认对此记录发起申诉？')) return
  try {
    await api.post(`/merchant-performance/slow-records/${id}/appeal`)
    await fetchSlowRecords()
  } catch (e: any) {
    alert(e.response?.data?.message || '操作失败')
  }
}

watch(activeTab, () => {
  fetchData()
})

onMounted(async () => {
  await fetchStations()
  await fetchData()
})
</script>
