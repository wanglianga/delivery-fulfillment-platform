<template>
  <div class="space-y-6">
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-text">工单详情 #{{ ticket?.id }}</h2>
        <StatusBadge :status="ticket?.status || ''" type="ticket" />
      </div>

      <div class="grid grid-cols-3 gap-4 text-sm">
        <div>
          <span class="text-text-light">工单类型:</span>
          <span class="ml-2 font-medium">{{ ticket?.type || '-' }}</span>
        </div>
        <div>
          <span class="text-text-light">订单ID:</span>
          <span class="ml-2 font-medium">{{ ticket?.orderId || '-' }}</span>
        </div>
        <div>
          <span class="text-text-light">优先级:</span>
          <span class="ml-2 font-medium" :class="priorityClass">{{ priorityLabel }}</span>
        </div>
      </div>
    </div>

    <div class="card">
      <h3 class="font-semibold text-text mb-4">异常信息</h3>
      <div v-if="exception" class="space-y-2 text-sm">
        <div>
          <span class="text-text-light">异常类型:</span>
          <span class="ml-2">{{ exception.type }}</span>
        </div>
        <div>
          <span class="text-text-light">描述:</span>
          <span class="ml-2">{{ exception.description || '-' }}</span>
        </div>
        <div>
          <span class="text-text-light">上报时间:</span>
          <span class="ml-2">{{ exception.createdAt || '-' }}</span>
        </div>
      </div>
      <div v-else class="text-sm text-text-muted">暂无异常信息</div>
    </div>

    <div class="card">
      <h3 class="font-semibold text-text mb-4">事件时间线</h3>
      <div class="space-y-3">
        <div
          v-for="(event, idx) in timeline"
          :key="idx"
          class="flex gap-3"
        >
          <div class="flex flex-col items-center">
            <div class="w-3 h-3 rounded-full bg-accent"></div>
            <div v-if="idx < timeline.length - 1" class="w-0.5 flex-1 bg-border"></div>
          </div>
          <div class="pb-4">
            <div class="text-sm font-medium text-text">{{ event.label }}</div>
            <div class="text-xs text-text-muted">{{ event.time }}</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="ticket?.status === 'open'" class="card">
      <h3 class="font-semibold text-text mb-4">责任判定</h3>
      <form @submit.prevent="judgeTicket" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-text mb-1">责任方</label>
          <select v-model="judgeForm.responsibility" class="select-field" required>
            <option value="">请选择</option>
            <option value="platform">平台</option>
            <option value="merchant">商户</option>
            <option value="rider">骑手</option>
            <option value="customer">客户</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-text mb-1">处理方案</label>
          <textarea v-model="judgeForm.resolution" class="input-field" rows="3" required placeholder="请输入处理方案"></textarea>
        </div>
        <button type="submit" class="btn-primary" :disabled="judging">
          {{ judging ? '判定中...' : '判定责任' }}
        </button>
      </form>
    </div>

    <div v-if="ticket?.status === 'judged'" class="card">
      <h3 class="font-semibold text-text mb-4">判定结果</h3>
      <div class="text-sm space-y-2 mb-4">
        <div>
          <span class="text-text-light">责任方:</span>
          <span class="ml-2 font-medium">{{ responsibilityLabel(ticket?.responsibility) }}</span>
        </div>
        <div>
          <span class="text-text-light">处理方案:</span>
          <span class="ml-2">{{ ticket?.resolution || '-' }}</span>
        </div>
      </div>
      <button class="btn-primary" :disabled="compensating" @click="compensateTicket">
        {{ compensating ? '处理中...' : '发起赔付' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useTicketsStore } from '@/stores/tickets'
import StatusBadge from '@/components/StatusBadge.vue'
import api from '@/api'

const route = useRoute()
const ticketsStore = useTicketsStore()
const ticketId = computed(() => Number(route.params.id))
const ticket = computed(() => ticketsStore.currentTicket)

const exception = ref<any>(null)
const judging = ref(false)
const compensating = ref(false)

const judgeForm = reactive({
  responsibility: '',
  resolution: '',
})

const priorityClass = computed(() => {
  const p = ticket.value?.priority
  if (p === 'urgent') return 'text-red-500'
  if (p === 'high') return 'text-orange-500'
  if (p === 'medium') return 'text-yellow-600'
  return 'text-gray-500'
})

const priorityLabel = computed(() => {
  const p = ticket.value?.priority
  if (p === 'urgent') return '紧急'
  if (p === 'high') return '高'
  if (p === 'medium') return '中'
  return '低'
})

const timeline = computed(() => {
  const events = []
  if (ticket.value) {
    events.push({ label: '工单创建', time: ticket.value.createdAt })
    if (ticket.value.status !== 'open') {
      events.push({ label: '开始处理', time: ticket.value.updatedAt })
    }
    if (['judged', 'compensating', 'closed'].includes(ticket.value.status)) {
      events.push({ label: `责任判定: ${responsibilityLabel(ticket.value.responsibility)}`, time: ticket.value.updatedAt })
    }
    if (['compensating', 'closed'].includes(ticket.value.status)) {
      events.push({ label: '发起赔付', time: ticket.value.updatedAt })
    }
    if (ticket.value.status === 'closed') {
      events.push({ label: '工单关闭', time: ticket.value.updatedAt })
    }
  }
  return events
})

function responsibilityLabel(r?: string) {
  const map: Record<string, string> = { platform: '平台', merchant: '商户', rider: '骑手', customer: '客户' }
  return map[r || ''] || r || '-'
}

async function judgeTicket() {
  judging.value = true
  try {
    await ticketsStore.judgeTicket(ticketId.value, judgeForm.responsibility, judgeForm.resolution)
    await ticketsStore.fetchTicket(ticketId.value)
  } finally {
    judging.value = false
  }
}

async function compensateTicket() {
  compensating.value = true
  try {
    await ticketsStore.compensateTicket(ticketId.value)
    await ticketsStore.fetchTicket(ticketId.value)
  } finally {
    compensating.value = false
  }
}

onMounted(async () => {
  await ticketsStore.fetchTicket(ticketId.value)
  try {
    const res = await api.get('/exceptions', {
      params: { orderId: ticket.value?.orderId },
    })
    exception.value = res.data?.[0] || null
  } catch {}
})
</script>
