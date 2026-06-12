<template>
  <div class="space-y-6">
    <div v-if="hasOrderAffectors" class="card border-l-4 border-accent">
      <h3 class="font-semibold text-text mb-3 flex items-center gap-2">
        <AlertTriangle class="w-4 h-4 text-accent" /> 订单影响因素
      </h3>
      <div class="flex flex-wrap gap-2">
        <span
          v-for="(w, idx) in order?.weatherAffected || []"
          :key="'w-' + idx"
          class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
          :class="weatherLevelClass(w.level)"
        >
          {{ w.type }}{{ weatherLevelLabel(w.level) }}
          <span v-if="w.detail" class="ml-1 opacity-90">({{ formatWeatherDetail(w.detail) }})</span>
        </span>
        <span
          v-if="order?.slowPrepareFlag === 1"
          class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700"
        >
          <Clock class="w-3 h-3 mr-1" /> 出餐慢
          <span class="ml-1">(等待{{ Math.floor((order?.slowPrepareWaitSeconds || 0) / 60) }}分钟)</span>
        </span>
      </div>
    </div>

    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-text">配送详情</h2>
        <StatusBadge :status="order?.status || ''" type="order" />
      </div>

      <div v-if="isArrivedStore" class="mb-4 p-3 rounded-lg bg-gray-50 border border-border">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Clock class="w-4 h-4 text-text-light" />
            <span class="text-sm text-text-light">到店等待时间：</span>
            <span
              class="font-mono text-lg font-semibold"
              :class="{
                'text-danger animate-pulse': waitSecondsExceeded,
                'text-text': !waitSecondsExceeded,
              }"
            >
              {{ formatWaitTime(waitSeconds) }}
            </span>
          </div>
          <span class="text-xs text-text-muted">
            阈值：{{ Math.floor(WAIT_THRESHOLD / 60) }}分钟
          </span>
        </div>
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
        <div class="col-span-2">
          <span class="text-text-light">照片凭证:</span>
          <div class="ml-2 mt-1 inline-flex gap-3 align-top">
            <div class="text-center">
              <img v-if="order?.pickupPhoto" :src="order.pickupPhoto" class="w-16 h-16 object-cover rounded border border-border" />
              <div v-else class="w-16 h-16 rounded border border-dashed border-border flex items-center justify-center text-text-muted text-xs">
                未上传
              </div>
              <div class="text-xs text-text-muted mt-1">取货照片</div>
            </div>
            <div class="text-center">
              <img v-if="order?.deliveryPhoto" :src="order.deliveryPhoto" class="w-16 h-16 object-cover rounded border border-border" />
              <div v-else class="w-16 h-16 rounded border border-dashed border-border flex items-center justify-center text-text-muted text-xs">
                未上传
              </div>
              <div class="text-xs text-text-muted mt-1">送达照片</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="waitSecondsExceeded && isArrivedStore" class="card border-l-4 border-danger bg-red-50/30">
      <div class="flex items-start gap-3">
        <AlertTriangle class="w-5 h-5 text-danger shrink-0 mt-0.5" />
        <div class="text-sm text-danger font-medium">
          ⚠️ 出餐已超过{{ Math.floor(WAIT_THRESHOLD / 60) }}分钟，系统已记录，请上传取货照片作为凭证，超时责任将计入商户履约评分
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
          v-if="canAction('merchant_confirm')"
          class="btn-secondary"
          :disabled="acting"
          @click="doAction('merchant-confirm', '商户确认出餐')"
        >
          <UtensilsCrossed class="w-4 h-4 mr-1 inline" /> 商户确认出餐
        </button>
        <template v-if="canAction('pick_up')">
          <button
            class="btn-primary"
            :disabled="acting"
            @click="doPickUp"
          >
            <Package class="w-4 h-4 mr-1 inline" /> 取货确认
          </button>
          <button
            class="btn-secondary"
            :disabled="acting"
            @click="triggerPickupPhotoUpload"
          >
            <Camera class="w-4 h-4 mr-1 inline" />
            {{ order?.pickupPhoto ? '重新上传取货照片' : '上传取货照片' }}
          </button>
          <input
            ref="pickupPhotoInput"
            type="file"
            accept="image/*"
            class="hidden"
            @change="uploadPickupPhoto"
          />
        </template>
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
          @click="triggerDeliveryPhotoUpload"
        >
          <Camera class="w-4 h-4 mr-1 inline" /> 上传送达照片
        </button>
        <input
          ref="deliveryPhotoInput"
          type="file"
          accept="image/*"
          class="hidden"
          @change="uploadDeliveryPhoto"
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

    <div v-if="order?.slowPrepareRecord" class="card">
      <h3 class="font-semibold text-text mb-3 flex items-center gap-2">
        <Clock class="w-4 h-4 text-danger" /> 出餐慢记录
      </h3>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span class="text-text-light">到店时间:</span>
          <span class="ml-2 font-medium">{{ formatTime(order.slowPrepareRecord.arrivedStoreAt) }}</span>
        </div>
        <div>
          <span class="text-text-light">商户确认时间:</span>
          <span class="ml-2 font-medium">{{ formatTime(order.slowPrepareRecord.merchantConfirmedAt) || '-' }}</span>
        </div>
        <div>
          <span class="text-text-light">取货时间:</span>
          <span class="ml-2 font-medium">{{ formatTime(order.slowPrepareRecord.pickedUpAt) || '-' }}</span>
        </div>
        <div>
          <span class="text-text-light">等待时长:</span>
          <span class="ml-2 font-medium text-danger">
            {{ Math.floor((order.slowPrepareRecord.waitSeconds || 0) / 60) }}分
            {{ (order.slowPrepareRecord.waitSeconds || 0) % 60 }}秒
          </span>
        </div>
        <div class="col-span-2">
          <span class="text-text-light">取货凭证照片:</span>
          <div class="ml-2 mt-1">
            <img v-if="order.slowPrepareRecord.pickupPhoto" :src="order.slowPrepareRecord.pickupPhoto" class="w-20 h-20 object-cover rounded border border-border" />
            <span v-else class="text-text-muted">未上传</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="order?.reassignRecords?.length" class="card border-l-4 border-orange-500">
      <h3 class="font-semibold text-text mb-3 flex items-center gap-2">
        <Repeat class="w-4 h-4 text-orange-600" /> 转派记录
      </h3>
      <div v-for="rec in order.reassignRecords" :key="rec.id" class="mb-3 last:mb-0">
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span class="text-text-light">事故类型：</span>
            <span class="font-medium">{{ accidentTypeLabel(rec.accidentType) }}</span>
          </div>
          <div>
            <span class="text-text-light">事故说明：</span>
            <span class="font-medium">{{ rec.accidentDescription }}</span>
          </div>
          <div>
            <span class="text-text-light">原骑手：</span>
            <span class="font-medium text-orange-600">{{ rec.originalRiderName }}</span>
          </div>
          <div>
            <span class="text-text-light">接力骑手：</span>
            <span class="font-medium text-accent">{{ rec.newRiderName || '待指派' }}</span>
          </div>
        </div>
        <div v-if="rec.originalRiderSegment" class="mt-2 p-2 rounded bg-gray-50 text-xs">
          <div class="font-medium text-text mb-1">轨迹段</div>
          <div class="flex gap-4">
            <div>
              <span class="text-text-light">原骑手续：</span>
              {{ rec.originalRiderName }} ({{ formatTime(rec.originalRiderSegment.fromTime) }} → {{ rec.originalRiderSegment.toTime ? formatTime(rec.originalRiderSegment.toTime) : '进行中' }})
            </div>
            <div v-if="rec.newRiderSegment?.riderId">
              <span class="text-text-light">新骑手续：</span>
              {{ rec.newRiderName }} ({{ formatTime(rec.newRiderSegment.fromTime) }} → {{ rec.newRiderSegment.toTime ? formatTime(rec.newRiderSegment.toTime) : '进行中' }})
            </div>
          </div>
        </div>
        <div class="mt-2 flex gap-4 text-xs">
          <span class="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">原骑手 {{ rec.originalRiderResponsibility }}%</span>
          <span class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">新骑手 {{ rec.newRiderResponsibility }}%</span>
          <span class="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">平台 {{ rec.platformResponsibility }}%</span>
        </div>
      </div>
    </div>

    <div v-if="order?.status === 'pending_negotiation'" class="card border-l-4 border-amber-500">
      <h3 class="font-semibold text-text mb-3 flex items-center gap-2">
        <MapPin class="w-4 h-4 text-amber-600" /> 地址修改协商
      </h3>
      <div class="space-y-3 text-sm">
        <div class="flex items-center gap-2">
          <span class="text-text-light">原地址：</span>
          <span class="line-through text-text-muted">{{ order.originalCustomerAddress }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-text-light">新地址：</span>
          <span class="font-medium">{{ order.customerAddress }}</span>
        </div>
        <div class="grid grid-cols-3 gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <div class="text-center">
            <div class="text-lg font-semibold text-amber-700">{{ order.addressChangeExtraDistance?.toFixed(1) || '0' }}km</div>
            <div class="text-xs text-amber-600">新增距离</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-semibold" :class="(order.addressChangeExtraFee || 0) > 0 ? 'text-red-600' : 'text-green-600'">
              ¥{{ order.addressChangeExtraFee?.toFixed(1) || '0' }}
            </div>
            <div class="text-xs text-amber-600">补差价</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-semibold" :class="order.addressChangeOutOfArea ? 'text-red-600' : 'text-green-600'">
              {{ order.addressChangeOutOfArea ? '超出' : '未超出' }}
            </div>
            <div class="text-xs text-amber-600">服务区</div>
          </div>
        </div>
        <div v-if="order.addressChangeOutOfArea" class="flex items-start gap-2 text-red-600 text-sm">
          <AlertTriangle class="w-4 h-4 shrink-0 mt-0.5" />
          <span>新地址超出服务区范围，请确认是否可以配送</span>
        </div>
        <div class="flex justify-end gap-3 pt-2">
          <button
            class="btn-secondary"
            :disabled="acting"
            @click="rejectAddressChange"
          >
            拒绝修改
          </button>
          <button
            class="btn-primary"
            :disabled="acting"
            @click="confirmAddressChange"
          >
            确认修改
          </button>
        </div>
      </div>
    </div>

    <div v-if="order?.addressChangeRecords?.filter((r: any) => r.status === 'rider_confirmed').length" class="card">
      <h3 class="font-semibold text-text mb-3 flex items-center gap-2">
        <MapPin class="w-4 h-4 text-green-600" /> 已确认的地址变更
      </h3>
      <div v-for="rec in order.addressChangeRecords.filter((r: any) => r.status === 'rider_confirmed')" :key="rec.id" class="text-sm">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-text-light">原地址：</span>
          <span class="line-through text-text-muted">{{ rec.originalAddress }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-text-light">新地址：</span>
          <span class="font-medium">{{ rec.newAddress }}</span>
          <span v-if="rec.extraFee > 0" class="text-xs text-red-600">+¥{{ rec.extraFee.toFixed(1) }}</span>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="flex items-center justify-between">
        <h3 class="font-semibold text-text">异常处理</h3>
        <div class="flex gap-2">
          <button class="btn-secondary" @click="showAccidentModal = true">
            <Bike class="w-4 h-4 mr-1 inline" /> 上报事故
          </button>
          <button class="btn-secondary" @click="showExceptionModal = true">
            <AlertTriangle class="w-4 h-4 mr-1 inline" /> 上报异常
          </button>
        </div>
      </div>
    </div>

    <Modal :show="showAccidentModal" title="上报事故" @close="showAccidentModal = false">
      <form @submit.prevent="submitAccident" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-text mb-1">事故类型</label>
          <select v-model="accidentForm.accidentType" class="select-field" required>
            <option value="crash">摔车</option>
            <option value="vehicle_breakdown">车辆故障</option>
            <option value="other">其他</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-text mb-1">事故说明</label>
          <textarea v-model="accidentForm.description" class="input-field" rows="4" placeholder="请详细描述事故情况" required></textarea>
        </div>
        <div>
          <label class="block text-sm font-medium text-text mb-1">现场照片</label>
          <input type="file" accept="image/*" multiple class="input-field" @change="handleAccidentPhotos" />
        </div>
        <div class="p-3 rounded-lg bg-orange-50 border border-orange-200 text-sm text-orange-800">
          上报事故后，订单将进入转派状态，调度将安排其他骑手接力配送。您的轨迹段和责任将被保留。
        </div>
        <div class="flex justify-end gap-3 pt-2">
          <button type="button" class="btn-secondary" @click="showAccidentModal = false">取消</button>
          <button type="submit" class="btn-primary" :disabled="submitting">
            {{ submitting ? '提交中...' : '确认上报' }}
          </button>
        </div>
      </form>
    </Modal>

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
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/api'
import StatusBadge from '@/components/StatusBadge.vue'
import StepProgress from '@/components/StepProgress.vue'
import Modal from '@/components/Modal.vue'
import { MapPin, Package, Truck, Camera, CheckCircle, AlertTriangle, Clock, UtensilsCrossed, Repeat, Bike } from 'lucide-vue-next'

const route = useRoute()
const orderId = computed(() => Number(route.params.id))

const WAIT_THRESHOLD = 600

const order = ref<any>(null)
const acting = ref(false)
const deliveryPhotoInput = ref<HTMLInputElement | null>(null)
const pickupPhotoInput = ref<HTMLInputElement | null>(null)
const showExceptionModal = ref(false)
const showAccidentModal = ref(false)
const submitting = ref(false)
const waitSeconds = ref(0)
let waitTimer: ReturnType<typeof setInterval> | null = null

const deliverySteps = ['接单', '到店', '取货', '配送', '送达', '签收']

const stepIndexMap: Record<string, number> = {
  pending: 0,
  accepted: 0,
  arrived_store: 1,
  picked_up: 2,
  delivering: 3,
  delivered: 4,
  signed: 5,
  reassigning: 3,
  pending_negotiation: 3,
}

const currentStepIndex = computed(() => stepIndexMap[order.value?.status || ''] ?? 0)

const actionVisibility: Record<string, string[]> = {
  arrive_store: ['accepted'],
  merchant_confirm: ['arrived_store'],
  pick_up: ['arrived_store'],
  deliver: ['picked_up'],
  deliver_photo: ['delivering'],
  sign: ['delivered'],
}

const isArrivedStore = computed(() => order.value?.status === 'arrived_store')

const waitSecondsExceeded = computed(() => waitSeconds.value > WAIT_THRESHOLD)

const hasOrderAffectors = computed(() => {
  return (order.value?.weatherAffected?.length > 0) || (order.value?.slowPrepareFlag === 1)
})

function canAction(action: string) {
  const allowedStatuses = actionVisibility[action] || []
  return allowedStatuses.includes(order.value?.status || '')
}

function weatherLevelClass(level: string) {
  if (level === 'red') return 'bg-red-100 text-red-700'
  if (level === 'orange') return 'bg-orange-100 text-orange-700'
  return 'bg-yellow-100 text-yellow-700'
}

function weatherLevelLabel(level: string) {
  if (level === 'red') return '红色'
  if (level === 'orange') return '橙色'
  return '黄色'
}

function formatWeatherDetail(detail: string) {
  if (detail.startsWith('+') && detail.endsWith('min')) {
    const mins = detail.slice(1, -3)
    return `延长${mins}分钟`
  }
  return detail
}

function formatWaitTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function startWaitTimer() {
  stopWaitTimer()
  updateWaitSeconds()
  waitTimer = setInterval(updateWaitSeconds, 1000)
}

function stopWaitTimer() {
  if (waitTimer) {
    clearInterval(waitTimer)
    waitTimer = null
  }
}

function updateWaitSeconds() {
  if (!order.value?.arrivedStoreAt) {
    waitSeconds.value = 0
    return
  }
  const arrived = new Date(order.value.arrivedStoreAt).getTime()
  waitSeconds.value = Math.floor((Date.now() - arrived) / 1000)
}

watch(isArrivedStore, (val) => {
  if (val) {
    startWaitTimer()
  } else {
    stopWaitTimer()
    waitSeconds.value = 0
  }
})

async function fetchOrder() {
  try {
    const res = await api.get(`/orders/${orderId.value}`)
    order.value = res.data
    if (isArrivedStore.value) {
      startWaitTimer()
    }
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

async function doPickUp() {
  acting.value = true
  try {
    const body: { pickupPhoto?: string } = {}
    if (order.value?.pickupPhoto) {
      body.pickupPhoto = order.value.pickupPhoto
    }
    await api.post(`/orders/${orderId.value}/pick-up`, body)
    await fetchOrder()
  } catch (e) {
    console.error('操作失败', e)
  } finally {
    acting.value = false
  }
}

function triggerDeliveryPhotoUpload() {
  deliveryPhotoInput.value?.click()
}

function triggerPickupPhotoUpload() {
  pickupPhotoInput.value?.click()
}

async function uploadDeliveryPhoto(event: Event) {
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

async function uploadPickupPhoto(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  acting.value = true
  try {
    const formData = new FormData()
    formData.append('photo', input.files[0])
    await api.post(`/orders/${orderId.value}/upload-pickup-photo`, formData, {
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

const accidentForm = reactive({
  accidentType: 'crash',
  description: '',
  photos: [] as string[],
})

function handleAccidentPhotos(event: Event) {
  const input = event.target as HTMLInputElement
  accidentForm.photos = Array.from(input.files || []).map(f => f.name)
}

async function submitAccident() {
  submitting.value = true
  try {
    await api.post(`/orders/${orderId.value}/report-accident`, {
      accidentType: accidentForm.accidentType,
      description: accidentForm.description,
      photos: accidentForm.photos,
    })
    showAccidentModal.value = false
    accidentForm.accidentType = 'crash'
    accidentForm.description = ''
    accidentForm.photos = []
    await fetchOrder()
  } catch (e) {
    console.error('上报事故失败', e)
  } finally {
    submitting.value = false
  }
}

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

async function confirmAddressChange() {
  acting.value = true
  try {
    await api.post(`/orders/${orderId.value}/confirm-address-change`)
    await fetchOrder()
  } catch (e) {
    console.error('确认地址修改失败', e)
  } finally {
    acting.value = false
  }
}

async function rejectAddressChange() {
  acting.value = true
  try {
    await api.post(`/orders/${orderId.value}/reject-address-change`, {
      reason: '骑手拒绝地址修改',
    })
    await fetchOrder()
  } catch (e) {
    console.error('拒绝地址修改失败', e)
  } finally {
    acting.value = false
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

onMounted(fetchOrder)
onUnmounted(() => {
  stopWaitTimer()
})
</script>
