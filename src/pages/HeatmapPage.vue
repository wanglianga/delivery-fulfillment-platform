<template>
  <div class="flex gap-6 h-[calc(100vh-10rem)]">
    <div class="flex-1 card overflow-hidden">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-text">订单热区</h2>
        <select v-model="timeRange" class="select-field w-auto" @change="fetchHeatmap">
          <option value="1h">近1小时</option>
          <option value="6h">近6小时</option>
          <option value="24h">近24小时</option>
        </select>
      </div>
      <div
        class="grid gap-1"
        :style="{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }"
      >
        <div
          v-for="(cell, idx) in gridCells"
          :key="idx"
          class="aspect-square rounded-sm flex items-center justify-center text-xs font-medium cursor-pointer transition-all duration-200 hover:scale-105"
          :class="densityColorClass(cell.density)"
          :title="`${cell.name}: ${cell.orderCount}单`"
          @click="selectArea(cell)"
        >
          <span :class="cell.density >= 0.7 ? 'text-white' : 'text-text'">{{ cell.orderCount }}</span>
        </div>
      </div>
      <div class="flex items-center gap-4 mt-4 text-xs text-text-light">
        <span class="flex items-center gap-1"><span class="w-4 h-4 rounded-sm bg-green-300 inline-block"></span> 低</span>
        <span class="flex items-center gap-1"><span class="w-4 h-4 rounded-sm bg-yellow-300 inline-block"></span> 中</span>
        <span class="flex items-center gap-1"><span class="w-4 h-4 rounded-sm bg-orange-400 inline-block"></span> 高</span>
        <span class="flex items-center gap-1"><span class="w-4 h-4 rounded-sm bg-red-500 inline-block"></span> 极高</span>
      </div>
    </div>

    <div class="w-72 shrink-0">
      <div class="card" v-if="selectedArea">
        <h3 class="font-semibold text-text mb-3">{{ selectedArea.name }}</h3>
        <div class="space-y-3">
          <div class="flex justify-between text-sm">
            <span class="text-text-light">订单数量</span>
            <span class="font-medium text-text">{{ selectedArea.orderCount }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-text-light">密度指数</span>
            <span class="font-medium" :class="densityTextClass(selectedArea.density)">{{ (selectedArea.density * 100).toFixed(0) }}%</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-text-light">热力等级</span>
            <span class="font-medium text-text">{{ densityLabel(selectedArea.density) }}</span>
          </div>
        </div>
      </div>
      <div v-else class="card text-center text-text-muted py-12">
        <Flame class="w-12 h-12 mx-auto mb-3 text-text-muted/50" />
        <p>点击热区格子查看详情</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useStationStore } from '@/stores/station'
import { useAuthStore } from '@/stores/auth'
import { Flame } from 'lucide-vue-next'

const stationStore = useStationStore()
const auth = useAuthStore()
const timeRange = ref('1h')
const selectedArea = ref<any>(null)

const gridCols = ref(8)

const gridCells = computed(() => {
  const areas = stationStore.heatmap?.areas || []
  if (areas.length === 0) {
    return Array.from({ length: 64 }, (_, i) => ({
      name: `区域${i + 1}`,
      orderCount: 0,
      density: 0,
    }))
  }
  const cells = areas.map((a: any) => ({
    name: a.name,
    orderCount: a.orderCount,
    density: a.density,
  }))
  while (cells.length < gridCols.value * 8) {
    cells.push({ name: `区域${cells.length + 1}`, orderCount: 0, density: 0 })
  }
  return cells.slice(0, gridCols.value * 8)
})

function densityColorClass(density: number) {
  if (density >= 0.8) return 'bg-red-500'
  if (density >= 0.6) return 'bg-orange-400'
  if (density >= 0.3) return 'bg-yellow-300'
  return 'bg-green-300'
}

function densityTextClass(density: number) {
  if (density >= 0.8) return 'text-red-500'
  if (density >= 0.6) return 'text-orange-500'
  if (density >= 0.3) return 'text-yellow-600'
  return 'text-green-600'
}

function densityLabel(density: number) {
  if (density >= 0.8) return '极高'
  if (density >= 0.6) return '高'
  if (density >= 0.3) return '中等'
  return '低'
}

function selectArea(cell: any) {
  selectedArea.value = cell
}

async function fetchHeatmap() {
  await stationStore.fetchHeatmap(auth.user?.stationId, timeRange.value)
}

onMounted(fetchHeatmap)
</script>
