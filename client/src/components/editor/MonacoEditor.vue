<script setup>
import loader from '@monaco-editor/loader'
import { onMounted, onBeforeUnmount, ref, watch, shallowRef } from 'vue'

const props = defineProps({
  value: { type: String, default: '' },
  language: { type: String, default: 'javascript' },
  readOnly: { type: Boolean, default: false },
  theme: { type: String, default: 'vs-dark' } // 'vs-dark' or custom
})

const emit = defineEmits(['change'])
const container = ref(null)
let editorInstance = null
let isInternalChange = false
const monacoRef = shallowRef(null)

onMounted(async () => {
  if (container.value) {
    try {
      // Load monaco from CDN (jsDelivr caching) - fixes massive local compile OOM issues
      const monaco = await loader.init()
      monacoRef.value = monaco

      editorInstance = monaco.editor.create(container.value, {
        value: props.value,
        language: props.language,
        theme: props.theme,
        automaticLayout: true,
        readOnly: props.readOnly,
        fontSize: 14,
        fontFamily: "'Fira Code', 'Monaco', 'Menlo', 'Courier New', monospace",
        minimap: { enabled: true },
        scrollBeyondLastLine: false,
        padding: { top: 16 }
      })

      editorInstance.onDidChangeModelContent(() => {
        if (isInternalChange) return
        
        const value = editorInstance.getValue()
        emit('change', value)
      })
    } catch (err) {
      console.error('[Editor] Failed to load Monaco from CDN:', err)
    }
  }
})

onBeforeUnmount(() => {
  if (editorInstance) {
    editorInstance.dispose()
  }
})

// Watchers to update editor when props change
watch(() => props.value, (newValue) => {
  if (editorInstance) {
    const currentValue = editorInstance.getValue()
    // Normalize line endings for comparison to avoid unnecessary updates
    const normalizedNew = newValue.replace(/\r\n/g, '\n')
    const normalizedCurrent = currentValue.replace(/\r\n/g, '\n')

    if (normalizedNew !== normalizedCurrent) {
      const position = editorInstance.getPosition()
      const scroll = editorInstance.getScrollTop()
      
      isInternalChange = true
      editorInstance.setValue(newValue)
      isInternalChange = false
      
      if (position) {
        editorInstance.setPosition(position)
        editorInstance.setScrollTop(scroll)
      }
    }
  }
})

watch(() => props.language, (newLang) => {
  if (editorInstance && monacoRef.value) {
    monacoRef.value.editor.setModelLanguage(editorInstance.getModel(), newLang)
  }
})

watch(() => props.readOnly, (newVal) => {
  if (editorInstance) {
    editorInstance.updateOptions({ readOnly: newVal })
  }
})
</script>

<template>
  <div ref="container" class="w-full h-full min-h-[300px]"></div>
</template>
