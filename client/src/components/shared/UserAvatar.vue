<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: {
    type: String,
    default: '?'
  },
  src: {
    type: String,
    default: null
  },
  size: {
    type: String, // 'sm', 'md', 'lg', 'xl'
    default: 'md'
  }
})

const initials = computed(() => {
  return props.name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
})

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-xl',
}

// Generate consistent color based on name length/char code? 
// For now, let's just use a gradient default or specific if passed.
</script>

<template>
  <div 
    class="relative rounded-full overflow-hidden flex items-center justify-center font-bold text-white bg-gradient-to-br from-gray-700 to-gray-900 border border-white/10 shadow-inner"
    :class="sizeClasses[size]"
  >
    <img v-if="src" :src="src" alt="Avatar" class="w-full h-full object-cover" />
    <span v-else>{{ initials }}</span>
  </div>
</template>
