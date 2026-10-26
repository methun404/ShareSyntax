<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String, // 'primary', 'secondary', 'ghost', 'danger'
    default: 'primary'
  },
  size: {
    type: String, // 'sm', 'md', 'lg', 'icon'
    default: 'md'
  },
  loading: {
    type: Boolean,
    default: false
  },
  block: {
    type: Boolean,
    default: false
  }
})

const classes = computed(() => {
  const base = "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-deep-black disabled:opacity-50 disabled:cursor-not-allowed"
  
  const variants = {
    primary: "bg-gradient-to-r from-neon-blue to-neon-cyan text-deep-black hover:shadow-lg hover:shadow-neon-blue/40 border border-transparent",
    secondary: "bg-surface-dark border border-white/10 text-white hover:bg-surface-light hover:border-white/20",
    ghost: "bg-transparent text-gray-400 hover:text-white hover:bg-white/5",
    danger: "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20"
  }
  
  const sizes = {
    sm: "text-xs px-3 py-1.5 gap-1.5",
    md: "text-sm px-4 py-2 gap-2",
    lg: "text-base px-6 py-3 gap-2",
    icon: "p-2 aspect-square"
  }
  
  return [
    base,
    variants[props.variant],
    sizes[props.size],
    props.block ? 'w-full' : ''
  ]
})
</script>

<template>
  <button :class="classes">
    <span v-if="loading" class="animate-spin mr-2">
       <!-- Simple Spinner -->
       <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
       </svg>
    </span>
    <slot name="icon-left" v-if="!loading && $slots['icon-left']" />
    <slot />
    <slot name="icon-right" v-if="!loading && $slots['icon-right']" />
  </button>
</template>
