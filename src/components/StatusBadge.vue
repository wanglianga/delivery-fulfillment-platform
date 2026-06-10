<template>
  <span
    :class="cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      colorClass
    )"
  >
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  status: string
  type?: 'order' | 'shift' | 'ticket' | 'compensation' | 'weather-affected' | 'slow-prepare'
}>()

const orderStatusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待接单', color: 'bg-yellow-100 text-yellow-800' },
  accepted: { label: '已接单', color: 'bg-blue-100 text-blue-800' },
  arrived_store: { label: '已到店', color: 'bg-blue-100 text-blue-800' },
  preparing: { label: '备餐中', color: 'bg-orange-100 text-orange-800' },
  ready: { label: '出餐完成', color: 'bg-blue-100 text-blue-800' },
  picked_up: { label: '已取货', color: 'bg-indigo-100 text-indigo-800' },
  delivering: { label: '配送中', color: 'bg-purple-100 text-purple-800' },
  deliver_photo: { label: '已送达', color: 'bg-green-100 text-green-800' },
  signed: { label: '已签收', color: 'bg-green-100 text-green-700' },
  completed: { label: '已完成', color: 'bg-green-100 text-green-700' },
  cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-600' },
  timeout: { label: '超时', color: 'bg-red-100 text-red-700' },
}

const shiftStatusMap: Record<string, { label: string; color: string }> = {
  scheduled: { label: '已排班', color: 'bg-blue-100 text-blue-800' },
  active: { label: '进行中', color: 'bg-green-100 text-green-700' },
  completed: { label: '已完成', color: 'bg-gray-100 text-gray-600' },
  cancelled: { label: '已取消', color: 'bg-red-100 text-red-700' },
}

const ticketStatusMap: Record<string, { label: string; color: string }> = {
  open: { label: '待处理', color: 'bg-orange-100 text-orange-800' },
  judging: { label: '判定中', color: 'bg-blue-100 text-blue-800' },
  judged: { label: '已判定', color: 'bg-purple-100 text-purple-800' },
  compensating: { label: '赔付中', color: 'bg-yellow-100 text-yellow-800' },
  closed: { label: '已关闭', color: 'bg-gray-100 text-gray-600' },
}

const compensationStatusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待审批', color: 'bg-orange-100 text-orange-800' },
  approved: { label: '已通过', color: 'bg-green-100 text-green-700' },
  rejected: { label: '已驳回', color: 'bg-red-100 text-red-700' },
  paid: { label: '已支付', color: 'bg-green-100 text-green-700' },
}

const weatherLevelColors: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  orange: 'bg-orange-100 text-orange-800',
  red: 'bg-red-100 text-red-800',
  gray: 'bg-gray-100 text-gray-600',
}

function getWeatherColor(text: string): string {
  if (text.includes('红')) return weatherLevelColors.red
  if (text.includes('橙')) return weatherLevelColors.orange
  if (text.includes('黄')) return weatherLevelColors.yellow
  if (text.includes('蓝')) return weatherLevelColors.blue
  return weatherLevelColors.gray
}

const maps: Record<string, Record<string, { label: string; color: string }>> = {
  order: orderStatusMap,
  shift: shiftStatusMap,
  ticket: ticketStatusMap,
  compensation: compensationStatusMap,
}

const statusInfo = computed(() => {
  if (props.type === 'slow-prepare') {
    return { label: props.status, color: 'bg-red-100 text-red-800 border border-red-200' }
  }
  if (props.type === 'weather-affected') {
    return { label: props.status, color: getWeatherColor(props.status) }
  }
  const map = maps[props.type || 'order'] || orderStatusMap
  return map[props.status] || { label: props.status, color: 'bg-gray-100 text-gray-600' }
})

const label = computed(() => statusInfo.value.label)
const colorClass = computed(() => statusInfo.value.color)
</script>
