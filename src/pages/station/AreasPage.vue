<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-text">服务区域配置</h2>
      <button class="btn-primary" @click="openCreateModal">
        <Plus class="w-4 h-4 mr-1 inline" /> 新增区域
      </button>
    </div>

    <div class="grid grid-cols-3 gap-4">
      <div v-for="area in areas" :key="area.id" class="card">
        <div class="flex items-start justify-between mb-3">
          <div>
            <h3 class="font-semibold text-text">{{ area.name }}</h3>
            <p class="text-sm text-text-light mt-1">覆盖范围: {{ area.coverage || '-' }}</p>
          </div>
          <div class="flex gap-2">
            <button class="text-info hover:underline text-sm" @click="openEditModal(area)">编辑</button>
            <button class="text-danger hover:underline text-sm" @click="deleteArea(area.id)">删除</button>
          </div>
        </div>
        <div class="text-sm text-text-light">
          <div>配送费规则: {{ area.deliveryFeeRule || '-' }}</div>
        </div>
      </div>
    </div>

    <Modal :show="showModal" :title="editingArea ? '编辑区域' : '新增区域'" @close="showModal = false">
      <form @submit.prevent="saveArea" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-text mb-1">区域名称</label>
          <input v-model="form.name" type="text" class="input-field" required />
        </div>
        <div>
          <label class="block text-sm font-medium text-text mb-1">覆盖范围</label>
          <textarea v-model="form.coverage" class="input-field" rows="3" placeholder="如: 东至XX路, 西至XX路"></textarea>
        </div>
        <div>
          <label class="block text-sm font-medium text-text mb-1">配送费规则</label>
          <textarea v-model="form.deliveryFeeRule" class="input-field" rows="2" placeholder="如: 3km内5元, 超出每km加2元"></textarea>
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
import Modal from '@/components/Modal.vue'
import { Plus } from 'lucide-vue-next'

const areas = ref<any[]>([])
const showModal = ref(false)
const editingArea = ref<any>(null)
const saving = ref(false)

const form = reactive({
  name: '',
  coverage: '',
  deliveryFeeRule: '',
})

async function fetchAreas() {
  try {
    const res = await api.get('/weather', { params: { stationId: 1 } })
    areas.value = res.data
  } catch {
    areas.value = [
      { id: 1, name: '中心区', coverage: '东至解放路, 西至建设路', deliveryFeeRule: '3km内5元' },
      { id: 2, name: '北区', coverage: '北环至北站', deliveryFeeRule: '5km内6元' },
      { id: 3, name: '南区', coverage: '南环至大学城', deliveryFeeRule: '4km内5元, 超出加2元/km' },
    ]
  }
}

function openCreateModal() {
  editingArea.value = null
  form.name = ''
  form.coverage = ''
  form.deliveryFeeRule = ''
  showModal.value = true
}

function openEditModal(area: any) {
  editingArea.value = area
  form.name = area.name
  form.coverage = area.coverage || ''
  form.deliveryFeeRule = area.deliveryFeeRule || ''
  showModal.value = true
}

async function saveArea() {
  saving.value = true
  try {
    if (editingArea.value) {
      await api.put(`/weather/${editingArea.value.id}`, form)
    } else {
      await api.post('/weather', { ...form, stationId: 1 })
    }
    showModal.value = false
    await fetchAreas()
  } catch {
    showModal.value = false
  } finally {
    saving.value = false
  }
}

async function deleteArea(id: number) {
  if (!confirm('确定删除此区域？')) return
  try {
    await api.delete(`/weather/${id}`)
  } catch {}
  await fetchAreas()
}

onMounted(fetchAreas)
</script>
