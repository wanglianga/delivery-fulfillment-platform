<template>
  <div class="space-y-6">
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-text">配送详情</h2>
        <StatusBadge :status="order?.status || ''" type="order" />
      </div>

      <StepProgress
        :currentStep="currentStepIndex"
        :steps="deliverySteps"
        class="mb-6"
      />

      <div class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span class="text-text-light">订单号:</span>
          <span class="ml-2 font-medium">{{ order?.orderNo || '-' }}</span>
        </div>
        <div>
          <span class="text-text-light">商户:</span>
          <span class="ml-2 font-medium">{{ order?.merchantName || '-' }}</span>
        </div>
        <div>
          <span class="text-text-light">客户:</span>
          <span class="ml-2 font-medium">{{ order?.customerName || '-' }}</span>
        </div>
        <div>
          <span class="text-text-light">地址:</span>
          <span class="ml-2 font-medium">{{ order?.customerAddress || '-' }}</span>
        </div>
        <div>
          <span class="text-text-light">金额:</span>
          <span class="ml-2 font-medium">¥{{ order?.totalAmount ?? '-' }}</span>
        </div>
        <div>
          <span class="text-text-light">送达照片:</span>
          <span class="ml-2">
            <img v-if="order?.deliveryPhoto" :src="order.deliveryPhoto" class="inline w-16 h-16 object-cover rounded" />
            <span v-else class="text-text-muted">未上传</span>
          </span>
        </div>
      </div>
    </div>

    <div class="card">
      <h3 class="font-semibold text-text mb-4">配送操作</h3>
      <div class="flex flex-wrap gap-3">
        <button
          v-if="canAction('arrive_store')"
          class="btn-primary"
          :disabled="acting"
          @click="doAction('arrive-store', '到店打卡')"
        >
          <MapPin class="w-4 h-4 mr-1 inline" /> 到店打卡
        </button>
        <button
          v-if="canAction('pick_up')"
          class="btn-primary"
          :disabled="acting"
          @click="doAction('pick-up', '取货确认')"
        >
          <Package class="w-4 h-4 mr-1 inline" /> 取货确认
        </button>
        <button
          v-if="canAction('deliver')"
          class="btn-primary"
          :disabled="acting"
          @click="doAction('deliver', '开始配送')"
        >
          <Truck class="w-4 h-4 mr-1 inline" /> 开始配送
        </button>
        <button
          v-if="canAction('deliver_photo')"
          class="btn-primary"
          :disabled="acting"
          @click="triggerPhotoUpload"
        >
          <Camera class="w-4 h-4 mr-1 inline" /> 上传送达照片
        </button>
        <input
          ref="photoInput"
          type="file"
          accept="image/*"
          class="hidden"
          @change="uploadPhoto"
        />
        <button
          v-if="canAction('sign')"
          class="bg-success hover:bg-success/90 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          :disabled="acting"
          @click="doAction('sign', '确认签收')"
        >
          <CheckCircle class="w-4 h-4 mr-1 inline" /> 确认签收
        </button>
      </div>
    </div>

    <div class="card">
      <h3 class="font-semibold text-text mb-3">配送时间线</h3>
      <div v-if="order?.timeline?.length" class="space-y-2">
        <div
          v-for="(evt, idx) in order.timeline"
          :key="idx"
          class="flex items-start gap-3 text-sm"
        >
          <div class="w-2 h-2 rounded-full mt-1.5 shrink-0"
               :class="idx === order.timeline.length - 1 ? 'bg-accent' : 'bg-border'"></div>
          <div>
            <span class="font-medium text-text">{{ evt.detail || evt.event }}</span>
            <span class="text-text-muted ml-2">{{ formatTime(evt.timestamp) }}</span>
          </div>
        </div>
      </div>
      <div v-else class="text-text-muted text-sm">暂无记录</div>
    </div>

    <div class="card">
      <div class="flex items-center justify-between">
        <h3 class="font-semibold text-text">异常处理</h3>
        <button class="btn-secondary" @click="showExceptionModal = true">
          <AlertTriangle class="w-4 h-4 mr-1 inline" /> 上报异常
        </button>
      </div>
    </div>

    <Modal :show="showExceptionModal" title="异常上报" @close="showExceptionModal = false">
      <form @submit.prevent="submitException" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-text mb-1">异常类型</label>
          <select v-model="exceptionForm.type" class="select-field" required>
            <option value="rainstorm">暴雨</option>
            <option value="slow_prepare">出餐慢</option>
            <option value="rider_accident">骑手事故</option>
            <option value="wrong_address">地址错误</option>
            <option value="timeout">超时</option>
            <option value="other">其他</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-text mb-1">描述</label>
          <textarea v-model="exceptionForm.description" class="input-field" rows="3" required></textarea>
        </div>
        <div class="flex justify-end gap-3 pt-2">
          <button type="button" class="btn-secondary" @click="showExceptionModal = false">取消</button>
          <button type="submit" class="btn-primary" :disabled="submitting">提交</button>
        </div>
      </form>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/api'
import StatusBadge from '@/components/StatusBadge.vue'
import StepProgress from '@/components/StepProgress.vue'
import Modal from '@/components/Modal.vue'
import { MapPin, Package, Truck, Camera, CheckCircle, AlertTriangle } from 'lucide-vue-next'

const route = useRoute()
const orderId = computed(() => Number(route.params.id))

const order = ref<any>(null)
const acting = ref(false)
const photoInput = ref<HTMLInputElement | null>(null)
const showExceptionModal = ref(false)
const submitting = ref(false)

const deliverySteps = ['接单', '到店', '取货', '配送', '送达', '签收']

const stepIndexMap: Record<string, number> = {
  pending: 0,
  accepted: 0,
  arrived_store: 1,
  picked_up: 2,
  delivering: 3,
  delivered: 4,
  signed: 5,
}

const currentStepIndex = computed(() => stepIndexMap[order.value?.status || ''] ?? 0)

const actionVisibility: Record<string, string[]> = {
  arrive_store: ['accepted'],
  pick_up: ['arrived_store'],
  deliver: ['picked_up'],
  deliver_photo: ['delivering'],
  sign: ['delivered'],
}

function canAction(action: string) {
  const allowedStatuses = actionVisibility[action] || []
  return allowedStatuses.includes(order.value?.status || '')
}

async function fetchOrder() {
  try {
    const res = await api.get(`/orders/${orderId.value}`)
    order.value = res.data
  } catch {
    order.value = null
  }
}

async function doAction(action: string, _label: string) {
  acting.value = true
  try {
    await api.post(`/orders/${orderId.value}/${action}`)
    await fetchOrder()
  } catch (e) {
    console.error('操作失败', e)
  } finally {
    acting.value = false
  }
}

function triggerPhotoUpload() {
  photoInput.value?.click()
}

async function uploadPhoto(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  acting.value = true
  try {
    const formData = new FormData()
    formData.append('photo', input.files[0])
    await api.post(`/orders/${orderId.value}/deliver-photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    await fetchOrder()
  } catch (e) {
    console.error('上传失败', e)
  } finally {
    acting.value = false
    input.value = ''
  }
}

function formatTime(ts: string) {
  if (!ts) return ''
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

const exceptionForm = reactive({
  type: 'rainstorm',
  description: '',
})

async function submitException() {
  submitting.value = true
  try {
    await api.post('/exceptions', {
      orderId: orderId.value,
      type: exceptionForm.type,
      description: exceptionForm.description,
    })
    showExceptionModal.value = false
    exceptionForm.type = 'rainstorm'
    exceptionForm.description = ''
  } catch (e) {
    console.error('上报异常失败', e)
  } finally {
    submitting.value = false
  }
}

onMounted(fetchOrder)
</script>
