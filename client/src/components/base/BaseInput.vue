<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  label: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'text'
  },
  error: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const updateValue = (e) => {
  emit('update:modelValue', e.target.value)
}
</script>

<template>
  <div class="w-full">
    <label v-if="label" class="block text-xs font-medium text-gray-400 mb-1.5 ml-1">
      {{ label }}
    </label>
    <div class="relative group">
      <input 
        :type="type"
        :value="modelValue"
        @input="updateValue"
        :placeholder="placeholder"
        class="w-full bg-surface-dark/50 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/50 transition-all duration-200"
        :class="error ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/50' : ''"
      />
      <!-- Glow effect on focus (can be handled by ring, but adding subtle extra here if needed) -->
    </div>
    <p v-if="error" class="text-xs text-red-400 mt-1 ml-1">{{ error }}</p>
  </div>
</template>
