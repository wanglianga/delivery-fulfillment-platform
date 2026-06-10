<template>
  <aside class="w-64 bg-primary flex flex-col h-full shrink-0">
    <div class="h-16 flex items-center px-6 border-b border-white/10">
      <Truck class="w-7 h-7 text-accent mr-3" />
      <span class="text-white font-bold text-lg">配送履约平台</span>
    </div>
    <nav class="flex-1 py-4 overflow-y-auto">
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="flex items-center px-6 py-3 text-sm text-white/70 hover:bg-primary-light hover:text-white transition-colors duration-200"
        :class="{ 'bg-primary-light text-white border-r-3 border-accent': isActive(item.path) }"
      >
        <component :is="item.icon" class="w-5 h-5 mr-3" />
        <span>{{ item.label }}</span>
      </router-link>
    </nav>
    <div class="p-4 border-t border-white/10">
      <div class="text-white/50 text-xs text-center">v1.0.0</div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  Truck,
  BarChart3,
  CalendarDays,
  MapPin,
  CloudSun,
  Zap,
  Flame,
  Bike,
  ClipboardList,
  AlertTriangle,
  Store,
  CheckCircle,
  Search,
  Headphones,
  TicketCheck,
  Banknote,
  Award,
  Clock,
} from 'lucide-vue-next'

const route = useRoute()
const auth = useAuthStore()

const navConfigs: Record<string, Array<{ path: string; label: string; icon: any }>> = {
  station: [
    { path: '/station', label: '运力监控', icon: BarChart3 },
    { path: '/station/shifts', label: '班次管理', icon: CalendarDays },
    { path: '/station/areas', label: '区域配置', icon: MapPin },
    { path: '/station/weather', label: '天气预警', icon: CloudSun },
    { path: '/station/peak-plan', label: '高峰预案', icon: Zap },
    { path: '/station/merchant-performance', label: '商户履约', icon: Award },
    { path: '/heatmap', label: '订单热区', icon: Flame },
  ],
  rider: [
    { path: '/rider', label: '我的班次', icon: CalendarDays },
    { path: '/rider/orders', label: '订单列表', icon: ClipboardList },
    { path: '/rider/exception', label: '异常上报', icon: AlertTriangle },
  ],
  merchant: [
    { path: '/merchant', label: '出餐确认', icon: Store },
    { path: '/merchant/slow-prepare', label: '出餐慢记录', icon: Clock },
    { path: '/merchant/exceptions', label: '异常上报', icon: AlertTriangle },
    { path: '/merchant/orders', label: '订单跟踪', icon: Search },
  ],
  cs: [
    { path: '/cs', label: '工单列表', icon: Headphones },
    { path: '/cs/compensation', label: '赔付审批', icon: Banknote },
  ],
}

const navItems = computed(() => navConfigs[auth.userRole] || [])

function isActive(path: string) {
  if (path === `/${auth.userRole}`) {
    return route.path === path
  }
  return route.path.startsWith(path)
}
</script>
