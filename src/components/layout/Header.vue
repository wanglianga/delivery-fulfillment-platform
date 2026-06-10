<template>
  <header class="h-16 bg-white border-b border-border flex items-center justify-between px-6 shrink-0">
    <div class="flex items-center text-sm">
      <span class="text-text-muted">{{ auth.roleLabel }}</span>
      <ChevronRight class="w-4 h-4 mx-2 text-text-muted" />
      <span class="text-text font-medium">{{ currentPageTitle }}</span>
    </div>
    <div class="flex items-center gap-4">
      <button class="relative p-2 text-text-light hover:text-text transition-colors">
        <Bell class="w-5 h-5" />
        <span class="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full"></span>
      </button>
      <div class="flex items-center gap-3 pl-4 border-l border-border">
        <div class="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
          <span class="text-white text-xs font-bold">{{ avatarLetter }}</span>
        </div>
        <div>
          <div class="text-sm font-medium text-text">{{ auth.userName }}</div>
          <div class="text-xs text-text-muted">{{ auth.roleLabel }}</div>
        </div>
        <button
          @click="auth.logout()"
          class="ml-2 p-1.5 text-text-light hover:text-danger transition-colors"
          title="退出登录"
        >
          <LogOut class="w-4 h-4" />
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ChevronRight, Bell, LogOut } from 'lucide-vue-next'

const route = useRoute()
const auth = useAuthStore()

const avatarLetter = computed(() => auth.userName.charAt(0) || '?')

const titleMap: Record<string, string> = {
  '/station': '运力监控',
  '/station/shifts': '班次管理',
  '/station/areas': '区域配置',
  '/station/weather': '天气预警',
  '/station/peak-plan': '高峰预案',
  '/heatmap': '订单热区',
  '/rider': '我的班次',
  '/rider/orders': '订单列表',
  '/rider/exception': '异常上报',
  '/merchant': '出餐确认',
  '/merchant/exceptions': '异常上报',
  '/merchant/orders': '订单跟踪',
  '/cs': '工单列表',
  '/cs/compensation': '赔付审批',
}

const currentPageTitle = computed(() => {
  if (route.path.includes('/rider/delivery/')) return '配送详情'
  if (route.path.includes('/cs/ticket/')) return '工单详情'
  return titleMap[route.path] || '配送履约平台'
})
</script>
