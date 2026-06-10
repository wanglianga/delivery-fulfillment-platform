<template>
  <div class="space-y-6">
    <h2 class="text-lg font-semibold text-text">赔付审批</h2>

    <DataTable :columns="columns" :data="compensationsStore.compensations" :loading="compensationsStore.loading">
      <template #status="{ row }">
        <StatusBadge :status="row.status" type="compensation" />
      </template>
      <template #actions="{ row }">
        <div v-if="row.status === 'pending'" class="flex gap-2">
          <button class="text-success hover:underline text-sm" @click="approve(row.id)">通过</button>
          <button class="text-danger hover:underline text-sm" @click="reject(row.id)">驳回</button>
        </div>
        <span v-else class="text-text-muted text-sm">-</span>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useCompensationsStore } from '@/stores/compensations'
import DataTable from '@/components/DataTable.vue'
import StatusBadge from '@/components/StatusBadge.vue'

const compensationsStore = useCompensationsStore()

const columns = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'ticketId', label: '工单ID' },
  { key: 'orderId', label: '订单ID' },
  { key: 'amount', label: '金额', sortable: true },
  { key: 'recipient', label: '收款方' },
  { key: 'type', label: '类型' },
  { key: 'status', label: '状态' },
  { key: 'actions', label: '操作' },
]

async function approve(id: number) {
  await compensationsStore.approveCompensation(id)
  await compensationsStore.fetchCompensations()
}

async function reject(id: number) {
  const reason = prompt('请输入驳回原因')
  if (reason === null) return
  await compensationsStore.rejectCompensation(id, reason)
  await compensationsStore.fetchCompensations()
}

onMounted(() => compensationsStore.fetchCompensations())
</script>
