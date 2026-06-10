<template>
  <div class="space-y-6">
    <h2 class="text-lg font-semibold text-text">商户异常上报</h2>

    <div class="card">
      <form @submit.prevent="submitException" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-text mb-1">关联订单ID</label>
          <input v-model.number="form.orderId" type="number" class="input-field" placeholder="请输入订单ID" required />
        </div>
        <div>
          <label class="block text-sm font-medium text-text mb-1">异常类型</label>
          <select v-model="form.type" class="select-field" required>
            <option value="stock_out">缺货</option>
            <option value="packaging_issue">包装异常</option>
            <option value="other">其他</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-text mb-1">描述</label>
          <textarea v-model="form.description" class="input-field" rows="4" placeholder="请详细描述异常情况" required></textarea>
        </div>
        <button type="submit" class="btn-primary" :disabled="submitting">
          {{ submitting ? '提交中...' : '提交' }}
        </button>
      </form>
    </div>

    <div class="card">
      <h3 class="font-semibold text-text mb-4">历史记录</h3>
      <DataTable :columns="columns" :data="exceptions" :loading="loading">
        <template #status="{ row }">
          <StatusBadge :status="row.status" type="ticket" />
        </template>
      </DataTable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import api from '@/api'
import DataTable from '@/components/DataTable.vue'
import StatusBadge from '@/components/StatusBadge.vue'

const exceptions = ref<any[]>([])
const loading = ref(false)
const submitting = ref(false)

const form = reactive({
  orderId: '' as number | '',
  type: 'stock_out',
  description: '',
})

const columns = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'orderId', label: '订单ID' },
  { key: 'type', label: '类型' },
  { key: 'description', label: '描述' },
  { key: 'status', label: '状态' },
  { key: 'createdAt', label: '时间', sortable: true },
]

async function submitException() {
  submitting.value = true
  try {
    await api.post('/exceptions', {
      orderId: Number(form.orderId),
      type: form.type,
      description: form.description,
    })
    form.orderId = ''
    form.type = 'stock_out'
    form.description = ''
    await fetchExceptions()
  } finally {
    submitting.value = false
  }
}

async function fetchExceptions() {
  loading.value = true
  try {
    const res = await api.get('/exceptions')
    exceptions.value = res.data
  } catch {
    exceptions.value = []
  } finally {
    loading.value = false
  }
}

onMounted(fetchExceptions)
</script>
