<template>
  <div class="space-y-6">
    <h2 class="text-lg font-semibold text-text">异常上报</h2>

    <div class="card">
      <form @submit.prevent="submitException" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-text mb-1">异常类型</label>
          <select v-model="form.type" class="select-field" required>
            <option value="rainstorm">暴雨</option>
            <option value="slow_prepare">出餐慢</option>
            <option value="rider_accident">骑手事故</option>
            <option value="wrong_address">地址错误</option>
            <option value="timeout">超时</option>
            <option value="other">其他</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-text mb-1">关联订单ID</label>
          <input v-model.number="form.orderId" type="number" class="input-field" placeholder="请输入订单ID" required />
        </div>
        <div>
          <label class="block text-sm font-medium text-text mb-1">描述</label>
          <textarea v-model="form.description" class="input-field" rows="4" placeholder="请详细描述异常情况" required></textarea>
        </div>
        <div>
          <label class="block text-sm font-medium text-text mb-1">照片上传</label>
          <input
            type="file"
            accept="image/*"
            multiple
            class="input-field"
            @change="handleFileChange"
          />
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
import { useAuthStore } from '@/stores/auth'
import DataTable from '@/components/DataTable.vue'
import StatusBadge from '@/components/StatusBadge.vue'

const auth = useAuthStore()
const exceptions = ref<any[]>([])
const loading = ref(false)
const submitting = ref(false)

const form = reactive({
  type: 'rainstorm',
  orderId: '' as number | '',
  description: '',
  photos: [] as string[],
})

const columns = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'orderId', label: '订单ID' },
  { key: 'type', label: '类型' },
  { key: 'description', label: '描述' },
  { key: 'status', label: '状态' },
  { key: 'createdAt', label: '时间', sortable: true },
]

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  form.photos = Array.from(input.files || []).map(f => f.name)
}

async function submitException() {
  submitting.value = true
  try {
    await api.post('/exceptions', {
      orderId: Number(form.orderId),
      type: form.type,
      description: form.description,
      photos: form.photos,
    })
    form.type = 'rainstorm'
    form.orderId = ''
    form.description = ''
    form.photos = []
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
