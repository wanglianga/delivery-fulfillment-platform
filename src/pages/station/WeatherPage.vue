<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-text">天气预警</h2>
      <button class="btn-primary" @click="openCreateModal">
        <Plus class="w-4 h-4 mr-1 inline" /> 发布预警
      </button>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div
        v-for="alert in alerts"
        :key="alert.id"
        class="card border-l-4"
        :class="levelBorderClass(alert.level)"
      >
        <div class="flex items-start justify-between mb-2">
          <div class="flex items-center gap-2">
            <component :is="levelIcon(alert.level)" class="w-5 h-5" :class="levelTextClass(alert.level)" />
            <span class="font-semibold text-text">{{ alert.type }}</span>
          </div>
          <span
            class="px-2 py-0.5 rounded text-xs font-medium"
            :class="levelBadgeClass(alert.level)"
          >
            {{ levelLabel(alert.level) }}
          </span>
        </div>
        <p class="text-sm text-text-light mb-2">{{ alert.description || '暂无描述' }}</p>
        <div class="text-xs text-text-muted mb-2">
          <span>{{ alert.startTime }}</span>
          <span class="mx-2">至</span>
          <span>{{ alert.endTime }}</span>
        </div>
        <div class="flex flex-wrap gap-2 text-xs mb-3">
          <span v-if="alert.deliveryRangeShrink > 0" class="px-2 py-1 rounded bg-orange-50 text-orange-600">
            缩小范围{{ Math.round(alert.deliveryRangeShrink * 100) }}%
          </span>
          <span v-if="alert.etaAddMinutes > 0" class="px-2 py-1 rounded bg-blue-50 text-blue-600">
            延长ETA{{ alert.etaAddMinutes }}分钟
          </span>
          <span v-if="alert.shiftAdjustment && alert.shiftAdjustment !== 'none'" class="px-2 py-1 rounded bg-purple-50 text-purple-600">
            班次调整{{ shiftAdjustmentLabel(alert.shiftAdjustment) }}
          </span>
        </div>
        <div class="flex justify-end mt-3 gap-2">
          <button class="btn-secondary text-sm" @click="applyCapacity(alert)" :disabled="applyingId === alert.id">
            {{ applyingId === alert.id ? '应用中...' : '一键应用运力调整' }}
          </button>
          <button class="text-info hover:underline text-sm" @click="openEditModal(alert)">编辑</button>
          <button class="text-danger hover:underline text-sm" @click="deleteAlert(alert.id)">删除</button>
        </div>
      </div>
    </div>

    <Modal :show="showModal" :title="editingAlert ? '编辑预警' : '发布预警'" @close="showModal = false">
      <form @submit.prevent="saveAlert" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-text mb-1">预警类型</label>
          <select v-model="form.type" class="select-field" required>
            <option value="暴雨">暴雨</option>
            <option value="大雪">大雪</option>
            <option value="大风">大风</option>
            <option value="高温">高温</option>
            <option value="冰雹">冰雹</option>
            <option value="台风">台风</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-text mb-1">预警等级</label>
          <select v-model="form.level" class="select-field" required>
            <option value="yellow">黄色预警</option>
            <option value="orange">橙色预警</option>
            <option value="red">红色预警</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-text mb-1">描述</label>
          <textarea v-model="form.description" class="input-field" rows="3" placeholder="预警详细描述"></textarea>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-text mb-1">开始时间</label>
            <input v-model="form.startTime" type="datetime-local" class="input-field" required />
          </div>
          <div>
            <label class="block text-sm font-medium text-text mb-1">结束时间</label>
            <input v-model="form.endTime" type="datetime-local" class="input-field" required />
          </div>
        </div>

        <div class="border-t border-border pt-4">
          <h3 class="text-sm font-semibold text-text mb-3">运力调整配置</h3>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-text mb-1">
                配送范围缩小比例 ({{ Math.round(form.deliveryRangeShrink * 100) }}%)
              </label>
              <input
                v-model.number="form.deliveryRangeShrink"
                type="range"
                min="0"
                max="1"
                step="0.05"
                class="w-full"
              />
              <div class="flex justify-between text-xs text-text-muted mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-text mb-1">
                预计送达增加分钟数
              </label>
              <input
                v-model.number="form.etaAddMinutes"
                type="number"
                min="0"
                max="120"
                step="5"
                class="input-field"
                placeholder="0"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-text mb-1">班次调整策略</label>
              <select v-model="form.shiftAdjustment" class="select-field">
                <option value="none">不调整</option>
                <option value="delay">延迟班次</option>
                <option value="reduce">减少班次</option>
                <option value="cancel">取消非必要班次</option>
              </select>
            </div>
            <div v-if="form.shiftAdjustment === 'delay'">
              <label class="block text-sm font-medium text-text mb-1">
                班次延迟分钟数
              </label>
              <input
                v-model.number="form.shiftDelayMinutes"
                type="number"
                min="0"
                max="120"
                step="5"
                class="input-field"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button type="button" class="btn-secondary" @click="showModal = false">取消</button>
          <button type="submit" class="btn-primary" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</button>
        </div>
      </form>
    </Modal>

    <div v-if="toast.show" class="toast" :class="toastClass">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed } from 'vue'
import api from '@/api'
import { useAuthStore } from '@/stores/auth'
import Modal from '@/components/Modal.vue'
import { Plus, AlertTriangle, CloudLightning, Siren } from 'lucide-vue-next'

const auth = useAuthStore()
const alerts = ref<any[]>([])
const showModal = ref(false)
const editingAlert = ref<any>(null)
const saving = ref(false)
const applyingId = ref<number | null>(null)

const toast = reactive({
  show: false,
  message: '',
  type: 'success' as 'success' | 'error',
})

const form = reactive({
  type: '暴雨',
  level: 'yellow',
  description: '',
  startTime: '',
  endTime: '',
  deliveryRangeShrink: 0,
  etaAddMinutes: 0,
  shiftAdjustment: 'none' as 'none' | 'delay' | 'reduce' | 'cancel',
  shiftDelayMinutes: 0,
})

const toastClass = computed(() => {
  return toast.type === 'success' ? 'bg-success' : 'bg-danger'
})

let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(message: string, type: 'success' | 'error' = 'success') {
  if (toastTimer) clearTimeout(toastTimer)
  toast.message = message
  toast.type = type
  toast.show = true
  toastTimer = setTimeout(() => {
    toast.show = false
  }, 3000)
}

function levelBorderClass(level: string) {
  if (level === 'red') return 'border-red-500'
  if (level === 'orange') return 'border-orange-500'
  return 'border-yellow-500'
}

function levelTextClass(level: string) {
  if (level === 'red') return 'text-red-500'
  if (level === 'orange') return 'text-orange-500'
  return 'text-yellow-500'
}

function levelBadgeClass(level: string) {
  if (level === 'red') return 'bg-red-100 text-red-700'
  if (level === 'orange') return 'bg-orange-100 text-orange-700'
  return 'bg-yellow-100 text-yellow-700'
}

function levelLabel(level: string) {
  if (level === 'red') return '红色预警'
  if (level === 'orange') return '橙色预警'
  return '黄色预警'
}

function levelIcon(level: string) {
  if (level === 'red') return Siren
  if (level === 'orange') return CloudLightning
  return AlertTriangle
}

function shiftAdjustmentLabel(value: string) {
  const map: Record<string, string> = {
    delay: '延迟',
    reduce: '减少',
    cancel: '取消非必要',
  }
  return map[value] || ''
}

watch(() => form.shiftAdjustment, (newVal) => {
  if (newVal !== 'delay') {
    form.shiftDelayMinutes = 0
  }
})

async function fetchAlerts() {
  try {
    const res = await api.get('/weather/alerts', {
      params: { stationId: auth.user?.stationId },
    })
    alerts.value = res.data
  } catch {
    alerts.value = []
  }
}

function openCreateModal() {
  editingAlert.value = null
  form.type = '暴雨'
  form.level = 'yellow'
  form.description = ''
  const now = new Date()
  form.startTime = now.toISOString().slice(0, 16)
  form.endTime = new Date(now.getTime() + 6 * 3600000).toISOString().slice(0, 16)
  form.deliveryRangeShrink = 0
  form.etaAddMinutes = 0
  form.shiftAdjustment = 'none'
  form.shiftDelayMinutes = 0
  showModal.value = true
}

function openEditModal(alert: any) {
  editingAlert.value = alert
  form.type = alert.type
  form.level = alert.level
  form.description = alert.description || ''
  form.startTime = alert.startTime?.slice(0, 16) || ''
  form.endTime = alert.endTime?.slice(0, 16) || ''
  form.deliveryRangeShrink = alert.deliveryRangeShrink ?? 0
  form.etaAddMinutes = alert.etaAddMinutes ?? 0
  form.shiftAdjustment = alert.shiftAdjustment || 'none'
  form.shiftDelayMinutes = alert.shiftDelayMinutes ?? 0
  showModal.value = true
}

async function saveAlert() {
  saving.value = true
  try {
    const payload = {
      stationId: auth.user?.stationId,
      type: form.type,
      level: form.level,
      description: form.description,
      startTime: form.startTime,
      endTime: form.endTime,
      deliveryRangeShrink: form.deliveryRangeShrink,
      etaAddMinutes: form.etaAddMinutes,
      shiftAdjustment: form.shiftAdjustment,
      shiftDelayMinutes: form.shiftAdjustment === 'delay' ? form.shiftDelayMinutes : 0,
    }
    if (editingAlert.value) {
      await api.put(`/weather/${editingAlert.value.id}`, payload)
    } else {
      await api.post('/weather', payload)
    }
    showModal.value = false
    await fetchAlerts()
  } finally {
    saving.value = false
  }
}

async function deleteAlert(id: number) {
  if (!confirm('确定删除此预警？')) return
  await api.delete(`/weather/${id}`)
  await fetchAlerts()
}

async function applyCapacity(alert: any) {
  applyingId.value = alert.id
  try {
    const res = await api.post(`/weather/${alert.id}/apply`)
    showToast(res.data?.message || '运力调整已成功应用', 'success')
  } catch (e: any) {
    showToast(e.response?.data?.message || '运力调整应用失败', 'error')
  } finally {
    applyingId.value = null
  }
}

onMounted(fetchAlerts)
</script>
