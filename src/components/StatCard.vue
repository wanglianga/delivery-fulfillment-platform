<template>
  <div class="card flex items-center gap-4">
    <div
      class="w-12 h-12 rounded-xl flex items-center justify-center"
      :class="bgColorClass"
    >
      <component :is="icon" class="w-6 h-6 text-white" />
    </div>
    <div class="flex-1 min-w-0">
      <div class="text-sm text-text-light">{{ title }}</div>
      <div class="text-2xl font-bold text-text">{{ value }}</div>
    </div>
    <div v-if="trend" class="text-sm" :class="trendClass">
      {{ trend > 0 ? '+' : '' }}{{ trend }}%
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  icon: any
  title: string
  value: string | number
  trend?: number
  color?: string
}>()

const bgColors: Record<string, string> = {
  blue: 'bg-info',
  green: 'bg-success',
  orange: 'bg-accent',
  red: 'bg-danger',
  purple: 'bg-purple-500',
}

const bgColorClass = computed(() => bgColors[props.color || 'blue'] || 'bg-info')

const trendClass = computed(() => {
  if (!props.trend) return ''
  return props.trend > 0 ? 'text-success' : 'text-danger'
})
</script>
