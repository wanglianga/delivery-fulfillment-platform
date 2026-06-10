<template>
  <div class="min-h-screen bg-gradient-to-br from-primary-dark via-primary to-primary-light flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-accent rounded-2xl mb-4">
          <Truck class="w-8 h-8 text-white" />
        </div>
        <h1 class="text-2xl font-bold text-white">配送履约平台</h1>
        <p class="text-white/60 mt-1">Delivery Fulfillment System</p>
      </div>

      <div class="grid grid-cols-4 gap-2 mb-6">
        <button
          v-for="role in roles"
          :key="role.value"
          @click="selectRole(role)"
          class="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-200"
          :class="selectedRole === role.value
            ? 'bg-accent text-white scale-105 shadow-lg'
            : 'bg-white/10 text-white/70 hover:bg-white/20'"
        >
          <component :is="role.icon" class="w-6 h-6" />
          <span class="text-xs font-medium">{{ role.label }}</span>
        </button>
      </div>

      <div class="bg-white rounded-2xl shadow-xl p-8">
        <form @submit.prevent="handleLogin" class="space-y-5">
          <div>
            <label class="block text-sm font-medium text-text mb-1.5">用户名</label>
            <input
              v-model="form.username"
              type="text"
              class="input-field"
              placeholder="请输入用户名"
              required
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-text mb-1.5">密码</label>
            <input
              v-model="form.password"
              type="password"
              class="input-field"
              placeholder="请输入密码"
              required
            />
          </div>
          <div v-if="errorMsg" class="text-sm text-danger bg-red-50 rounded-lg px-3 py-2">
            {{ errorMsg }}
          </div>
          <button
            type="submit"
            class="btn-primary w-full py-3 text-base"
            :disabled="submitting"
          >
            {{ submitting ? '登录中...' : '登录' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { Truck, BarChart3, Bike, Store, Headphones } from 'lucide-vue-next'

const auth = useAuthStore()

const roles = [
  { value: 'station', label: '站点', icon: BarChart3, username: 'station1' },
  { value: 'rider', label: '骑手', icon: Bike, username: 'rider1' },
  { value: 'merchant', label: '商户', icon: Store, username: 'merchant1' },
  { value: 'cs', label: '客服', icon: Headphones, username: 'cs1' },
]

const selectedRole = ref('')
const submitting = ref(false)
const errorMsg = ref('')

const form = reactive({
  username: '',
  password: '',
})

function selectRole(role: typeof roles[0]) {
  selectedRole.value = role.value
  form.username = role.username
  form.password = '123456'
}

async function handleLogin() {
  errorMsg.value = ''
  submitting.value = true
  try {
    await auth.login(form.username, form.password, selectedRole.value || undefined)
  } catch (err: any) {
    errorMsg.value = err.response?.data?.message || '登录失败，请检查用户名和密码'
  } finally {
    submitting.value = false
  }
}
</script>
