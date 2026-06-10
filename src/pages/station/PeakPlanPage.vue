<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-text">高峰预案管理</h2>
      <button class="btn-primary" @click="openCreateModal">
        <Plus class="w-4 h-4 mr-1 inline" /> 新建预案
      </button>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div v-for="plan in plans" :key="plan.id" class="card">
        <div class="flex items-start justify-between mb-3">
          <div>
            <h3 class="font-semibold text-text">{{ plan.name }}</h3>
            <p class="text-sm text-text-light mt-1">触发条件: {{ plan.triggerCondition || '-' }}</p>
          </div>
          <span
            class="px-2.5 py-0.5 rounded-full text-xs font-medium"
            :class="plan.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'"
          >
            {{ plan.status === 'active' ? '已激活' : '未激活' }}
          </span>
        </div>
        <div v-if="plan.actions?.length" class="text-sm text-text-light mb-3">
          <div>执行动作:</div>
          <ul class="list-disc list-inside ml-2">
            <li v-for="(action, idx) in plan.actions" :key="idx">{{ action }}</li>
          </ul>
        </div>
        <div class="flex justify-end gap-2 mt-3">
          <button
            v-if="plan.status !== 'active'"
            class="text-success hover:underline text-sm"
            @click="activatePlan(plan.id)"
          >激活</button>
          <button
            v-else
            class="text-text-light hover:underline text-sm"
            @click="deactivatePlan(plan.id)"
          >停用</button>
          <button class="text-info hover:underline text-sm" @click="openEditModal(plan)">编辑</button>
          <button class="text-danger hover:underline text-sm" @click="deletePlan(plan.id)">删除</button>
        </div>
      </div>
    </div>

    <Modal :show="showModal" :title="editingPlan ? '编辑预案' : '新建预案'" @close="showModal = false">
      <form @submit.prevent="savePlan" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-text mb-1">预案名称</label>
          <input v-model="form.name" type="text" class="input-field" required />
        </div>
        <div>
          <label class="block text-sm font-medium text-text mb-1">触发条件</label>
          <textarea v-model="form.triggerCondition" class="input-field" rows="2" placeholder="如: 订单量 > 100/小时"></textarea>
        </div>
        <div>
          <label class="block text-sm font-medium text-text mb-1">执行动作（每行一个）</label>
          <textarea v-model="form.actionsText" class="input-field" rows="4" placeholder="如:&#10;增加5名骑手&#10;延长配送时间15分钟"></textarea>
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
import Modal from '@/components/Modal.vue'
import { Plus } from 'lucide-vue-next'

const auth = useAuthStore()
const plans = ref<any[]>([])
const showModal = ref(false)
const editingPlan = ref<any>(null)
const saving = ref(false)

const form = reactive({
  name: '',
  triggerCondition: '',
  actionsText: '',
})

async function fetchPlans() {
  try {
    const res = await api.get('/peak-plans', {
      params: { stationId: auth.user?.stationId },
    })
    plans.value = res.data
  } catch {
    plans.value = []
  }
}

function openCreateModal() {
  editingPlan.value = null
  form.name = ''
  form.triggerCondition = ''
  form.actionsText = ''
  showModal.value = true
}

function openEditModal(plan: any) {
  editingPlan.value = plan
  form.name = plan.name
  form.triggerCondition = plan.triggerCondition || ''
  form.actionsText = (plan.actions || []).join('\n')
  showModal.value = true
}

async function savePlan() {
  saving.value = true
  try {
    const payload = {
      stationId: auth.user?.stationId,
      name: form.name,
      triggerCondition: form.triggerCondition,
      actions: form.actionsText.split('\n').filter(Boolean),
    }
    if (editingPlan.value) {
      await api.put(`/peak-plans/${editingPlan.value.id}`, payload)
    } else {
      await api.post('/peak-plans', payload)
    }
    showModal.value = false
    await fetchPlans()
  } finally {
    saving.value = false
  }
}

async function activatePlan(id: number) {
  await api.post(`/peak-plans/${id}/activate`)
  await fetchPlans()
}

async function deactivatePlan(id: number) {
  await api.post(`/peak-plans/${id}/deactivate`)
  await fetchPlans()
}

async function deletePlan(id: number) {
  if (!confirm('确定删除此预案？')) return
  await api.delete(`/peak-plans/${id}`)
  await fetchPlans()
}

onMounted(fetchPlans)
</script>
