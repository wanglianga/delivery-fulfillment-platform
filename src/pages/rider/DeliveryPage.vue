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
          class="btn-success"
          :disabled="acting"
          @click="doAction('sign', '确认签收')"
        >
          <CheckCircle class="w-4 h-4 mr-1 inline" /> 确认签收
        </button>
      </div>
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
import { useOrdersStore } from '@/stores/orders'
import StatusBadge from '@/components/StatusBadge.vue'
import StepProgress from '@/components/StepProgress.vue'
import Modal from '@/components/Modal.vue'
import api from '@/api'
import { MapPin, Package, Truck, Camera, CheckCircle, AlertTriangle } from 'lucide-vue-next'

const route = useRoute()
const ordersStore = useOrdersStore()
const orderId = computed(() => Number(route.params.id))

const order = computed(() => ordersStore.currentOrder)
const acting = ref(false)
const photoInput = ref<HTMLInputElement | null>(null)
const showExceptionModal = ref(false)
const submitting = ref(false)

const deliverySteps = ['到店', '取货', '配送', '送达', '签收']

const stepIndexMap: Record<string, number> = {
  pending: 0,
  accepted: 0,
  arrived_store: 0,
  picked_up: 1,
  delivering: 2,
  deliver_photo: 3,
  signed: 4,
  completed: 4,
}

const currentStepIndex = computed(() => stepIndexMap[order.value?.status || ''] ?? 0)

const actionVisibility: Record<string, string[]> = {
  arrive_store: ['accepted', 'arrived_store'],
  pick_up: ['arrived_store'],
  deliver: ['picked_up'],
  deliver_photo: ['delivering'],
  sign: ['delivering', 'deliver_photo'],
}

function canAction(action: string) {
  const allowedStatuses = actionVisibility[action] || []
  return allowedStatuses.includes(order.value?.status || '')
}

async function doAction(action: string, label: string) {
  acting.value = true
  try {
    switch (action) {
      case 'arrive-store': await ordersStore.arriveStore(orderId.value); break
      case 'pick-up': await ordersStore.pickUp(orderId.value); break
      case 'deliver': await ordersStore.deliver(orderId.value); break
      case 'sign': await ordersStore.sign(orderId.value); break
    }
    await ordersStore.fetchOrder(orderId.value)
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
    await ordersStore.deliverPhoto(orderId.value, input.files[0])
    await ordersStore.fetchOrder(orderId.value)
  } finally {
    acting.value = false
    input.value = ''
  }
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
  } finally {
    submitting.value = false
  }
}

onMounted(() => ordersStore.fetchOrder(orderId.value))
</script>
