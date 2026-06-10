<template>
  <div class="space-y-6">
    <h2 class="text-lg font-semibold text-text">我的班次</h2>

    <div class="grid grid-cols-7 gap-2">
      <div
        v-for="day in weekDays"
        :key="day.date"
        class="min-h-[120px]"
      >
        <div
          class="text-xs font-medium mb-2 px-1"
          :class="day.isToday ? 'text-accent' : 'text-text-light'"
        >
          {{ day.label }}
          <span v-if="day.isToday" class="ml-1 px-1.5 py-0.5 bg-accent text-white rounded text-xs">今天</span>
        </div>
        <div class="space-y-1">
          <div
            v-for="shift in getShiftsForDay(day.date)"
            :key="shift.id"
            class="px-2 py-1.5 rounded-lg text-xs border"
            :class="shiftCardClass(shift)"
          >
            <div class="font-medium">{{ shift.type === 'morning' ? '早班' : shift.type === 'afternoon' ? '午班' : shift.type === 'evening' ? '晚班' : '夜班' }}</div>
            <div class="text-text-light mt-0.5">{{ shift.startTime }}-{{ shift.endTime }}</div>
            <div v-if="shift.serviceArea" class="text-text-muted mt-0.5">{{ shift.serviceArea }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '@/api'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const shifts = ref<any[]>([])

const weekDays = computed(() => {
  const today = new Date()
  const dayOfWeek = today.getDay() || 7
  const monday = new Date(today)
  monday.setDate(today.getDate() - dayOfWeek + 1)

  const labels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return {
      date: d.toISOString().split('T')[0],
      label: labels[i],
      isToday: d.toDateString() === today.toDateString(),
    }
  })
})

function getShiftsForDay(date: string) {
  return shifts.value.filter(s => s.date === date)
}

function shiftCardClass(shift: any) {
  if (shift.status === 'active') return 'bg-green-50 border-green-200 text-green-800'
  if (shift.status === 'completed') return 'bg-gray-50 border-gray-200 text-gray-600'
  return 'bg-blue-50 border-blue-200 text-blue-800'
}

async function fetchShifts() {
  try {
    const res = await api.get('/shifts', {
      params: { riderId: auth.user?.id },
    })
    shifts.value = res.data
  } catch {
    shifts.value = []
  }
}

onMounted(fetchShifts)
</script>
