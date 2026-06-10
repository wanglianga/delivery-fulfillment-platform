<template>
  <div class="flex gap-6 h-[calc(100vh-10rem)]">
    <div class="w-64 shrink-0 space-y-4">
      <div class="card">
        <h3 class="font-semibold text-text mb-4">筛选条件</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-text-light mb-1">工单类型</label>
            <select v-model="filters.type" class="select-field" @change="fetchTickets">
              <option value="">全部</option>
              <option value="timeout">超时</option>
              <option value="lost">丢失</option>
              <option value="wrong_delivery">错送</option>
              <option value="customer_reject">客户拒收</option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-text-light mb-1">状态</label>
            <select v-model="filters.status" class="select-field" @change="fetchTickets">
              <option value="">全部</option>
              <option value="open">待处理</option>
              <option value="judging">判定中</option>
              <option value="judged">已判定</option>
              <option value="compensating">赔付中</option>
              <option value="closed">已关闭</option>
            </select>
          </div>
          <button class="btn-secondary w-full text-sm" @click="resetFilters">重置</button>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto space-y-3">
      <div
        v-for="ticket in tickets"
        :key="ticket.id"
        class="card cursor-pointer hover:shadow-md transition-shadow"
        @click="goToDetail(ticket.id)"
      >
        <div class="flex items-start justify-between mb-2">
          <div class="flex items-center gap-2">
            <span
              class="w-2.5 h-2.5 rounded-full"
              :class="priorityDotClass(ticket.priority)"
            ></span>
            <span class="font-medium text-text">{{ ticket.type }}</span>
            <span class="text-sm text-text-muted">工单 #{{ ticket.id }}</span>
          </div>
          <StatusBadge :status="ticket.status" type="ticket" />
        </div>
        <div class="text-sm text-text-light">
          订单ID: {{ ticket.orderId }} · 优先级:
          <span :class="priorityTextClass(ticket.priority)">{{ priorityLabel(ticket.priority) }}</span>
        </div>
      </div>

      <div v-if="tickets.length === 0 && !loading" class="text-center text-text-muted py-12">
        暂无工单
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTicketsStore } from '@/stores/tickets'
import StatusBadge from '@/components/StatusBadge.vue'

const router = useRouter()
const ticketsStore = useTicketsStore()
const tickets = ref<any[]>([])
const loading = ref(false)

const filters = reactive({
  type: '',
  status: '',
})

function priorityDotClass(priority: string) {
  if (priority === 'urgent') return 'bg-red-500'
  if (priority === 'high') return 'bg-orange-500'
  if (priority === 'medium') return 'bg-yellow-500'
  return 'bg-gray-400'
}

function priorityTextClass(priority: string) {
  if (priority === 'urgent') return 'text-red-500'
  if (priority === 'high') return 'text-orange-500'
  if (priority === 'medium') return 'text-yellow-600'
  return 'text-gray-500'
}

function priorityLabel(priority: string) {
  if (priority === 'urgent') return '紧急'
  if (priority === 'high') return '高'
  if (priority === 'medium') return '中'
  return '低'
}

async function fetchTickets() {
  loading.value = true
  try {
    const params: any = {}
    if (filters.type) params.type = filters.type
    if (filters.status) params.status = filters.status
    await ticketsStore.fetchTickets(params)
    tickets.value = ticketsStore.tickets
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.type = ''
  filters.status = ''
  fetchTickets()
}

function goToDetail(id: number) {
  router.push(`/cs/ticket/${id}`)
}

onMounted(fetchTickets)
</script>
