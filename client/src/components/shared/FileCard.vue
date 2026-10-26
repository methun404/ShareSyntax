<script setup>
import { computed } from 'vue'
import { File, Download, Image, FileText } from 'lucide-vue-next'
import BaseButton from '@/components/base/BaseButton.vue'

const props = defineProps({
  file: {
    type: Object,
    required: true
  },
  isSelf: {
    type: Boolean,
    default: false
  }
})

const formatSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const icon = computed(() => {
  if (props.file.type.startsWith('image/')) return Image
  if (props.file.type.startsWith('text/')) return FileText
  return File
})

const downloadFile = () => {
    // Logic to download file
    console.log('Download', props.file)
    // If it's a blob/url
    if (props.file.url) {
        const a = document.createElement('a')
        a.href = props.file.url
        a.download = props.file.name
        a.click()
    }
}
</script>

<template>
  <div 
    class="flex items-center gap-3 p-3 rounded-xl max-w-xs md:max-w-sm"
    :class="isSelf ? 'bg-black/20 text-black border border-black/5' : 'bg-surface-dark border border-white/10 text-white'"
  >
    <div class="h-12 w-12 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
      <component :is="icon" :size="24" :class="isSelf ? 'text-black/70' : 'text-neon-cyan'" />
    </div>
    
    <div class="flex-1 min-w-0">
      <h3 class="font-medium text-sm truncate">{{ file.name }}</h3>
      <p class="text-xs opacity-70">{{ formatSize(file.size) }}</p>
    </div>

    <BaseButton 
      @click="downloadFile" 
      variant="ghost" 
      size="icon" 
      class="shrink-0"
      :class="isSelf ? 'text-black/60 hover:text-black hover:bg-black/10' : 'text-gray-400 hover:text-neon-blue'"
    >
      <Download :size="18" />
    </BaseButton>
  </div>
</template>
