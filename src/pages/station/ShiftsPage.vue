<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <label class="text-sm text-text-light">选择日期</label>
        <input v-model="selectedDate" type="date" class="input-field w-auto" @change="fetchShifts" />
      </div>
      <button class="btn-primary" @click="openCreateModal">
        <Plus class="w-4 h-4 mr-1 inline" /> 新建班次
      </button>
    </div>

    <DataTable :columns="columns" :data="shifts" :loading="loading">
      <template #status="{ row }">
        <StatusBadge :status="row.status" type="shift" />
      </template>
      <template #actions="{ row }">
        <div class="flex gap-2">
          <button class="text-info hover:underline text-sm" @click="openEditModal(row)">编辑</button>
          <button class="text-danger hover:underline text-sm" @click="deleteShift(row.id)">删除</button>
        </div>
      </template>
    </DataTable>

    <Modal :show="showModal" :title="editingShift ? '编辑班次' : '新建班次'" @close="showModal = false">
      <form @submit.prevent="saveShift" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-text mb-1">骑手</label>
          <select v-model="form.riderId" class="select-field" required>
            <option value="">请选择骑手</option>
            <option v-for="r in riders" :key="r.id" :value="r.id">{{ r.name }}</option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-text mb-1">开始时间</label>
            <input v-model="form.startTime" type="time" class="input-field" required />
          </div>
          <div>
            <label class="block text-sm font-medium text-text mb-1">结束时间</label>
            <input v-model="form.endTime" type="time" class="input-field" required />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-text mb-1">班次类型</label>
          <select v-model="form.type" class="select-field" required>
            <option value="morning">早班</option>
            <option value="afternoon">午班</option>
            <option value="evening">晚班</option>
            <option value="night">夜班</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-text mb-1">服务区域</label>
          <input v-model="form.serviceArea" type="text" class="input-field" placeholder="请输入服务区域" />
        </div>
        <div class="flex justify-end gap-3 pt-2">
          <button type="button" class="btn-secondary" @click="showModal = false">取消</button>
          <button type="submit" class="btn-primary" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</button>
        </div>
      </form>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import api from '@/api'
import { useAuthStore } from '@/stores/auth'
import DataTable from '@/components/DataTable.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import Modal from '@/components/Modal.vue'
import { Plus } from 'lucide-vue-next'

const auth = useAuthStore()
const shifts = ref<any[]>([])
const riders = ref<any[]>([])
const loading = ref(false)
const saving = ref(false)
const showModal = ref(false)
const editingShift = ref<any>(null)
const selectedDate = ref(new Date().toISOString().split('T')[0])

const form = reactive({
  riderId: '' as string | number,
  startTime: '08:00',
  endTime: '12:00',
  type: 'morning',
  serviceArea: '',
})

const columns = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'date', label: '日期', sortable: true },
  { key: 'startTime', label: '开始时间' },
  { key: 'endTime', label: '结束时间' },
  { key: 'type', label: '类型' },
  { key: 'serviceArea', label: '服务区域' },
  { key: 'status', label: '状态' },
  { key: 'actions', label: '操作' },
]

async function fetchShifts() {
  loading.value = true
  try {
    const res = await api.get('/shifts', {
      params: { stationId: auth.user?.stationId, date: selectedDate.value },
    })
    shifts.value = res.data
  } finally {
    loading.value = false
  }
}

async function fetchRiders() {
  try {
    const res = await api.get('/station/capacity', {
      params: { stationId: auth.user?.stationId },
    })
    riders.value = res.data.riders || []
  } catch {}
}

function openCreateModal() {
  editingShift.value = null
  form.riderId = ''
  form.startTime = '08:00'
  form.endTime = '12:00'
  form.type = 'morning'
  form.serviceArea = ''
  showModal.value = true
}

function openEditModal(shift: any) {
  editingShift.value = shift
  form.riderId = shift.riderId
  form.startTime = shift.startTime
  form.endTime = shift.endTime
  form.type = shift.type
  form.serviceArea = shift.serviceArea || ''
  showModal.value = true
}

async function saveShift() {
  saving.value = true
  try {
    const payload = {
      riderId: Number(form.riderId),
      stationId: auth.user?.stationId,
      date: selectedDate.value,
      startTime: form.startTime,
      endTime: form.endTime,
      type: form.type,
      serviceArea: form.serviceArea,
    }
    if (editingShift.value) {
      await api.put(`/shifts/${editingShift.value.id}`, payload)
    } else {
      await api.post('/shifts', payload)
    }
    showModal.value = false
    await fetchShifts()
  } finally {
    saving.value = false
  }
}

async function deleteShift(id: number) {
  if (!confirm('确定删除此班次？')) return
  await api.delete(`/shifts/${id}`)
  await fetchShifts()
}

onMounted(() => {
  fetchShifts()
  fetchRiders()
})
</script>
