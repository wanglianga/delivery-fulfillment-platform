<template>
  <div class="flex items-center gap-0">
    <template v-for="(step, idx) in steps" :key="idx">
      <div class="flex items-center">
        <div
          class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors duration-200"
          :class="stepClass(idx)"
        >
          <Check v-if="idx < currentStep" class="w-4 h-4" />
          <span v-else>{{ idx + 1 }}</span>
        </div>
        <span
          class="ml-2 text-sm whitespace-nowrap"
          :class="idx <= currentStep ? 'text-text font-medium' : 'text-text-muted'"
        >
          {{ step }}
        </span>
      </div>
      <div
        v-if="idx < steps.length - 1"
        class="mx-3 h-0.5 w-8"
        :class="idx < currentStep ? 'bg-success' : 'bg-border'"
      ></div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { Check } from 'lucide-vue-next'

const props = defineProps<{
  currentStep: number
  steps: string[]
}>()

function stepClass(idx: number) {
  if (idx < props.currentStep) return 'bg-success text-white'
  if (idx === props.currentStep) return 'bg-accent text-white'
  return 'bg-gray-200 text-text-muted'
}
</script>
