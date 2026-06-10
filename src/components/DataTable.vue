<template>
  <div class="card overflow-hidden p-0">
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-bg border-b border-border">
            <th
              v-for="col in columns"
              :key="col.key"
              class="px-4 py-3 text-left font-medium text-text-light whitespace-nowrap cursor-pointer select-none hover:text-text"
              @click="sortBy(col.key)"
            >
              <span class="inline-flex items-center gap-1">
                {{ col.label }}
                <ArrowUpDown v-if="col.sortable" class="w-3.5 h-3.5" :class="{ 'text-accent': sortKey === col.key }" />
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading" v-for="i in 5" :key="i" class="border-b border-border">
            <td v-for="col in columns" :key="col.key" class="px-4 py-3">
              <div class="h-4 bg-gray-100 rounded animate-pulse"></div>
            </td>
          </tr>
          <tr v-else-if="sortedData.length === 0">
            <td :colspan="columns.length" class="px-4 py-8 text-center text-text-muted">
              暂无数据
            </td>
          </tr>
          <tr
            v-else
            v-for="(row, idx) in paginatedData"
            :key="idx"
            class="border-b border-border hover:bg-bg/50 transition-colors"
          >
            <td v-for="col in columns" :key="col.key" class="px-4 py-3 whitespace-nowrap">
              <slot :name="col.key" :row="row" :value="row[col.key]">
                {{ row[col.key] }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="totalPages > 1" class="flex items-center justify-between px-4 py-3 border-t border-border">
      <span class="text-sm text-text-muted">共 {{ sortedData.length }} 条</span>
      <div class="flex items-center gap-2">
        <button
          class="px-3 py-1 text-sm rounded border border-border disabled:opacity-40 hover:bg-gray-50"
          :disabled="currentPage <= 1"
          @click="currentPage--"
        >上一页</button>
        <span class="text-sm text-text">{{ currentPage }} / {{ totalPages }}</span>
        <button
          class="px-3 py-1 text-sm rounded border border-border disabled:opacity-40 hover:bg-gray-50"
          :disabled="currentPage >= totalPages"
          @click="currentPage++"
        >下一页</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ArrowUpDown } from 'lucide-vue-next'

export interface Column {
  key: string
  label: string
  sortable?: boolean
}

const props = withDefaults(defineProps<{
  columns: Column[]
  data: any[]
  loading?: boolean
  pageSize?: number
}>(), {
  loading: false,
  pageSize: 10,
})

const sortKey = ref('')
const sortOrder = ref<'asc' | 'desc'>('asc')
const currentPage = ref(1)

function sortBy(key: string) {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'asc'
  }
}

const sortedData = computed(() => {
  if (!sortKey.value) return props.data
  return [...props.data].sort((a, b) => {
    const aVal = a[sortKey.value]
    const bVal = b[sortKey.value]
    if (aVal < bVal) return sortOrder.value === 'asc' ? -1 : 1
    if (aVal > bVal) return sortOrder.value === 'asc' ? 1 : -1
    return 0
  })
})

const totalPages = computed(() => Math.ceil(sortedData.value.length / props.pageSize))

const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * props.pageSize
  return sortedData.value.slice(start, start + props.pageSize)
})
</script>
