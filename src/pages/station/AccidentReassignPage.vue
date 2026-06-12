<template>
  <div class="space-y-6">
    <h2 class="text-lg font-semibold text-text">事故转派处理</h2>

    <div v-if="orders.length === 0 && !loading" class="card text-center text-text-muted py-12">
      暂无待转派订单
    </div>

    <div v-for="order in orders" :key="order.id" class="card border-l-4 border-orange-500">
      <div class="flex items-start justify-between mb-3">
        <div>
          <span class="font-mono text-sm text-text-light">{{ order.orderNo }}</span>
          <StatusBadge :status="order.status" type="order" class="ml-2" />
        </div>
        <span class="text-xs text-text-muted">{{ formatTime(order.updatedAt) }}</span>
      </div>

      <div class="grid grid-cols-2 gap-3 text-sm mb-3">
        <div>
          <span class="text-text-light">商户：</span>
          <span class="font-medium">{{ order.merchantName || '-' }}</span>
        </div>
        <div>
          <span class="text-text-light">原骑手：</span>
          <span class="font-medium text-orange-600">{{ order.riderName || '-' }}</span>
        </div>
        <div>
          <span class="text-text-light">顾客：</span>
          <span class="font-medium">{{ order.customerName }}</span>
        </div>
        <div>
          <span class="text-text-light">地址：</span>
          <span class="font-medium">{{ order.customerAddress }}</span>
        </div>
      </div>

      <div v-if="order.reassignRecords?.length" class="mb-3 p-3 rounded-lg bg-orange-50 border border-orange-200">
        <div class="flex items-center gap-2 mb-2">
          <AlertTriangle class="w-4 h-4 text-orange-600" />
          <span class="text-sm font-medium text-orange-800">事故信息</span>
        </div>
        <div class="text-sm space-y-1" v-for="rec in order.reassignRecords" :key="rec.id">
          <div>
            <span class="text-text-light">事故类型：</span>
            <span class="font-medium">{{ accidentTypeLabel(rec.accidentType) }}</span>
          </div>
          <div>
            <span class="text-text-light">说明：</span>
            <span>{{ rec.accidentDescription }}</span>
          </div>
          <div>
            <span class="text-text-light">上报时间：</span>
            <span>{{ formatTime(rec.createdAt) }}</span>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-3">
        <button
          class="btn-secondary"
          :disabled="loadingRiders === order.id"
          @click="loadNearbyRiders(order.id)"
        >
          <Users class="w-4 h-4 mr-1 inline" />
          {{ selectedOrderId === order.id && nearbyRiders ? '刷新骑手' : '查找附近骑手' }}
        </button>
        <button
          class="btn-primary"
          @click="openReassignModal(order)"
        >
          <Repeat class="w-4 h-4 mr-1 inline" /> 转派订单
        </button>
      </div>

      <div v-if="selectedOrderId === order.id && nearbyRiders" class="mt-3 pt-3 border-t border-border">
        <h4 class="text-sm font-medium text-text mb-2">可转派骑手</h4>
        <div v-if="nearbyRiders.available.length" class="mb-2">
          <div class="text-xs text-text-muted mb-1">空闲骑手</div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="rider in nearbyRiders.available"
              :key="rider.id"
              class="px-3 py-1.5 rounded-lg text-sm border transition-colors"
              :class="selectedRiderId === rider.id ? 'bg-accent text-white border-accent' : 'bg-white border-border hover:border-accent'"
              @click="selectedRiderId = rider.id"
            >
              {{ rider.name }}
            </button>
          </div>
        </div>
        <div v-if="nearbyRiders.busy.length">
          <div class="text-xs text-text-muted mb-1">配送中骑手（按当前订单数排序）</div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="rider in nearbyRiders.busy"
              :key="rider.id"
              class="px-3 py-1.5 rounded-lg text-sm border transition-colors"
              :class="selectedRiderId === rider.id ? 'bg-accent text-white border-accent' : 'bg-white border-border hover:border-accent'"
              @click="selectedRiderId = rider.id"
            >
              {{ rider.name }}（{{ rider.activeOrderCount }}单）
            </button>
          </div>
        </div>
        <div v-if="!nearbyRiders.available.length && !nearbyRiders.busy.length" class="text-sm text-text-muted">
          未找到可转派骑手
        </div>
      </div>
    </div>

    <Modal :show="showReassignModal" title="确认转派" @close="showReassignModal = false">
      <div v-if="reassigningOrder" class="space-y-4">
        <div class="p-3 rounded-lg bg-gray-50 border border-border text-sm">
          <div class="mb-1"><span class="text-text-light">订单号：</span>{{ reassigningOrder.orderNo }}</div>
          <div class="mb-1"><span class="text-text-light">原骑手：</span>{{ reassigningOrder.riderName }}</div>
          <div><span class="text-text-light">新骑手：</span><span class="font-medium text-accent">{{ selectedRiderName }}</span></div>
        </div>

        <div v-if="!selectedRiderId" class="text-sm text-orange-600">
          请先在订单卡片中选择目标骑手
        </div>

        <div v-if="selectedRiderId">
          <label class="block text-sm font-medium text-text mb-2">责任拆分（百分比）</label>
          <div class="space-y-2">
            <div class="flex items-center gap-3">
              <span class="text-sm text-text-light w-24">原骑手：</span>
              <input v-model.number="responsibilitySplit.originalRider" type="number" min="0" max="100" class="input-field w-20" />
              <span class="text-sm text-text-muted">%</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-sm text-text-light w-24">新骑手：</span>
              <input v-model.number="responsibilitySplit.newRider" type="number" min="0" max="100" class="input-field w-20" />
              <span class="text-sm text-text-muted">%</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-sm text-text-light w-24">平台：</span>
              <input v-model.number="responsibilitySplit.platform" type="number" min="0" max="100" class="input-field w-20" />
              <span class="text-sm text-text-muted">%</span>
            </div>
          </div>
          <div v-if="splitTotal !== 100" class="text-xs text-orange-600 mt-1">
            当前总计 {{ splitTotal }}%，需等于 100%
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button class="btn-secondary" @click="showReassignModal = false">取消</button>
          <button
            class="btn-primary"
            :disabled="!selectedRiderId || splitTotal !== 100 || submitting"
            @click="doReassign"
          >
            {{ submitting ? '转派中...' : '确认转派' }}
          </button>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '@/api'
import { useAuthStore } from '@/stores/auth'
import StatusBadge from '@/components/StatusBadge.vue'
import Modal from '@/components/Modal.vue'
import { AlertTriangle, Users, Repeat } from 'lucide-vue-next'

const auth = useAuthStore()
const orders = ref<any[]>([])
const loading = ref(false)
const loadingRiders = ref<number | null>(null)
const nearbyRiders = ref<{ available: any[]; busy: any[] } | null>(null)
const selectedOrderId = ref<number | null>(null)
const selectedRiderId = ref<number | null>(null)
const showReassignModal = ref(false)
const reassigningOrder = ref<any>(null)
const submitting = ref(false)

const responsibilitySplit = ref({
  originalRider: 0,
  newRider: 100,
  platform: 0,
})

const splitTotal = computed(() => {
  return responsibilitySplit.value.originalRider + responsibilitySplit.value.newRider + responsibilitySplit.value.platform
})

const selectedRiderName = computed(() => {
  if (!selectedRiderId.value || !nearbyRiders.value) return ''
  const all = [...(nearbyRiders.value.available || []), ...(nearbyRiders.value.busy || [])]
  return all.find(r => r.id === selectedRiderId.value)?.name || ''
})

async function fetchReassigningOrders() {
  loading.value = true
  try {
    const stationId = auth.user?.stationId
    const params: Record<string, string> = {}
    if (stationId) params.stationId = String(stationId)
    const res = await api.get('/orders/reassigning', { params })
    orders.value = Array.isArray(res.data) ? res.data : []
  } catch {
    orders.value = []
  } finally {
    loading.value = false
  }
}

async function loadNearbyRiders(orderId: number) {
  loadingRiders.value = orderId
  try {
    const res = await api.get(`/orders/${orderId}/nearby-riders`)
    nearbyRiders.value = res.data
    selectedOrderId.value = orderId
    selectedRiderId.value = null
  } catch {
    nearbyRiders.value = null
  } finally {
    loadingRiders.value = null
  }
}

function openReassignModal(order: any) {
  reassigningOrder.value = order
  if (!selectedRiderId.value || selectedOrderId.value !== order.id) {
    selectedRiderId.value = null
  }
  responsibilitySplit.value = { originalRider: 0, newRider: 100, platform: 0 }
  showReassignModal.value = true
}

async function doReassign() {
  if (!reassigningOrder.value || !selectedRiderId.value) return
  submitting.value = true
  try {
    await api.post(`/orders/${reassigningOrder.value.id}/reassign`, {
      newRiderId: selectedRiderId.value,
      responsibilitySplit: responsibilitySplit.value,
    })
    showReassignModal.value = false
    selectedRiderId.value = null
    nearbyRiders.value = null
    selectedOrderId.value = null
    await fetchReassigningOrders()
  } catch (e) {
    console.error('转派失败', e)
  } finally {
    submitting.value = false
  }
}

function accidentTypeLabel(type: string) {
  const map: Record<string, string> = {
    crash: '摔车',
    vehicle_breakdown: '车辆故障',
    other: '其他',
  }
  return map[type] || type
}

function formatTime(ts: string) {
  if (!ts) return ''
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

onMounted(fetchReassigningOrders)
</script>
