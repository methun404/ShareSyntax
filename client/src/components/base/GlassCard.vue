<script setup>
defineProps({
  hoverEffect: {
    type: Boolean,
    default: true
  },
  padding: {
    type: String,
    default: 'p-6'
  }
})
</script>

<template>
  <div 
    class="glass-card relative overflow-hidden transition-all duration-300"
    :class="[
      padding,
      hoverEffect ? 'hover:bg-surface-dark/80 hover:scale-[1.01] hover:shadow-neon-blue/20' : ''
    ]"
  >
    <div class="relative z-10">
      <slot />
    </div>
    
    <!-- Subtle Gradient Overlay -->
    <div class="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
  </div>
</template>
