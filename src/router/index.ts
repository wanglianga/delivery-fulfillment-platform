import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/LoginPage.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: () => {
          const user = localStorage.getItem('user')
          if (user) {
            try {
              const role = JSON.parse(user).role
              const map: Record<string, string> = { station: '/station', rider: '/rider', merchant: '/merchant', cs: '/cs' }
              return map[role] || '/login'
            } catch {}
          }
          return '/login'
        },
      },
      {
        path: 'station',
        name: 'station',
        component: () => import('@/pages/station/CapacityPage.vue'),
        meta: { roles: ['station'] },
      },
      {
        path: 'station/shifts',
        name: 'station-shifts',
        component: () => import('@/pages/station/ShiftsPage.vue'),
        meta: { roles: ['station'] },
      },
      {
        path: 'station/areas',
        name: 'station-areas',
        component: () => import('@/pages/station/AreasPage.vue'),
        meta: { roles: ['station'] },
      },
      {
        path: 'station/weather',
        name: 'station-weather',
        component: () => import('@/pages/station/WeatherPage.vue'),
        meta: { roles: ['station'] },
      },
      {
        path: 'station/peak-plan',
        name: 'station-peak-plan',
        component: () => import('@/pages/station/PeakPlanPage.vue'),
        meta: { roles: ['station'] },
      },
      {
        path: 'station/merchant-performance',
        name: 'station-merchant-performance',
        component: () => import('@/pages/station/MerchantPerformancePage.vue'),
        meta: { roles: ['station'] },
      },
      {
        path: 'station/accident-reassign',
        name: 'station-accident-reassign',
        component: () => import('@/pages/station/AccidentReassignPage.vue'),
        meta: { roles: ['station'] },
      },
      {
        path: 'heatmap',
        name: 'heatmap',
        component: () => import('@/pages/HeatmapPage.vue'),
        meta: { roles: ['station'] },
      },
      {
        path: 'rider',
        name: 'rider',
        component: () => import('@/pages/rider/MyShiftsPage.vue'),
        meta: { roles: ['rider'] },
      },
      {
        path: 'rider/orders',
        name: 'rider-orders',
        component: () => import('@/pages/rider/OrdersPage.vue'),
        meta: { roles: ['rider'] },
      },
      {
        path: 'rider/delivery/:id',
        name: 'rider-delivery',
        component: () => import('@/pages/rider/DeliveryPage.vue'),
        meta: { roles: ['rider'] },
      },
      {
        path: 'rider/exception',
        name: 'rider-exception',
        component: () => import('@/pages/rider/ExceptionReportPage.vue'),
        meta: { roles: ['rider'] },
      },
      {
        path: 'merchant',
        name: 'merchant',
        component: () => import('@/pages/merchant/PreparePage.vue'),
        meta: { roles: ['merchant'] },
      },
      {
        path: 'merchant/exceptions',
        name: 'merchant-exceptions',
        component: () => import('@/pages/merchant/MerchantExceptionPage.vue'),
        meta: { roles: ['merchant'] },
      },
      {
        path: 'merchant/slow-prepare',
        name: 'merchant-slow-prepare',
        component: () => import('@/pages/merchant/SlowPreparePage.vue'),
        meta: { roles: ['merchant'] },
      },
      {
        path: 'merchant/orders',
        name: 'merchant-orders',
        component: () => import('@/pages/merchant/OrderTrackPage.vue'),
        meta: { roles: ['merchant'] },
      },
      {
        path: 'cs',
        name: 'cs',
        component: () => import('@/pages/cs/TicketListPage.vue'),
        meta: { roles: ['cs'] },
      },
      {
        path: 'cs/ticket/:id',
        name: 'cs-ticket-detail',
        component: () => import('@/pages/cs/TicketDetailPage.vue'),
        meta: { roles: ['cs'] },
      },
      {
        path: 'cs/compensation',
        name: 'cs-compensation',
        component: () => import('@/pages/cs/CompensationPage.vue'),
        meta: { roles: ['cs'] },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('token')

  if (to.meta.requiresAuth !== false && !token) {
    return next('/login')
  }

  if (to.path === '/login' && token) {
    const user = localStorage.getItem('user')
    if (user) {
      try {
        const role = JSON.parse(user).role
        const map: Record<string, string> = { station: '/station', rider: '/rider', merchant: '/merchant', cs: '/cs' }
        return next(map[role] || '/')
      } catch {}
    }
    return next('/')
  }

  if (to.meta.roles && token) {
    const user = localStorage.getItem('user')
    if (user) {
      try {
        const role = JSON.parse(user).role
        if (!(to.meta.roles as string[]).includes(role)) {
          const map: Record<string, string> = { station: '/station', rider: '/rider', merchant: '/merchant', cs: '/cs' }
          return next(map[role] || '/')
        }
      } catch {}
    }
  }

  next()
})

export default router
