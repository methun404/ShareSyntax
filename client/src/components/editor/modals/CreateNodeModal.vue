<script setup>
import { ref, computed } from 'vue'
import { FilePlus, FolderPlus, X, Lock, Globe } from 'lucide-vue-next'
import GlassCard from '@/components/base/GlassCard.vue'

const props = defineProps({
  isOpen: Boolean,
  initialType: { type: String, default: 'file' }, // 'file' | 'folder'
  parentId: String
})

const emit = defineEmits(['close', 'create'])

const name = ref('')
const type = ref(props.initialType)
const visibility = ref('public') // 'public' | 'private'
const isValid = computed(() => {
    return name.value.trim().length > 0
})

const create = () => {
    if (!isValid.value) return
    
    let finalName = name.value
    if (type.value === 'file' && !finalName.includes('.')) {
        finalName += '.txt'
    }

    emit('create', {
        name: finalName,
        type: type.value,
        visibility: visibility.value,
        parentId: props.parentId
    })
    close()
}

const close = () => {
    name.value = ''
    type.value = props.initialType
    visibility.value = 'public'
    emit('close')
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-deep-black/80 backdrop-blur-sm">
      <GlassCard class="w-full max-w-md p-6 relative overflow-hidden animate-fade-scale-up">
          <button @click="close" class="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X :size="20" />
          </button>

          <h2 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <component :is="type === 'file' ? FilePlus : FolderPlus" class="text-neon-blue" />
              Create New {{ type === 'file' ? 'File' : 'Folder' }}
          </h2>

          <div class="space-y-4">
              <!-- Type Toggle -->
              <div class="flex p-1 bg-white/5 rounded-lg">
                  <button 
                    @click="type = 'file'" 
                    class="flex-1 py-2 text-sm font-medium rounded-md transition-all"
                    :class="type === 'file' ? 'bg-neon-blue/20 text-neon-blue' : 'text-gray-400 hover:text-gray-200'"
                >File</button>
                  <button 
                    @click="type = 'folder'" 
                    class="flex-1 py-2 text-sm font-medium rounded-md transition-all"
                    :class="type === 'folder' ? 'bg-neon-blue/20 text-neon-blue' : 'text-gray-400 hover:text-gray-200'"
                >Folder</button>
              </div>

              <!-- Name Input -->
              <div>
                  <label class="block text-xs font-medium text-gray-400 mb-1">Name</label>
                  <input 
                    v-model="name" 
                    type="text" 
                    placeholder="e.g., script.js" 
                    class="w-full bg-deep-black/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-neon-blue/50 transition-colors"
                  />
                  <p v-if="name && type === 'file' && !isValid" class="text-xs text-error mt-1">
                      Invalid extension. Allowed: {{ allowedExtensions.join(', ') }}
                  </p>
              </div>

              <!-- Visibility -->
              <div>
                  <label class="block text-xs font-medium text-gray-400 mb-1">Visibility</label>
                  <div class="grid grid-cols-2 gap-3">
                      <div 
                        @click="visibility = 'public'"
                        class="cursor-pointer p-3 rounded-xl border transition-all"
                        :class="visibility === 'public' ? 'bg-neon-blue/10 border-neon-blue/50' : 'bg-white/5 border-white/5 hover:border-white/20'"
                      >
                          <Globe :size="18" class="mb-2" :class="visibility === 'public' ? 'text-neon-blue' : 'text-gray-400'" />
                          <div class="text-sm font-bold text-white">Public</div>
                          <div class="text-[10px] text-gray-500">Visible to everyone in room</div>
                      </div>

                      <div 
                        @click="visibility = 'private'"
                        class="cursor-pointer p-3 rounded-xl border transition-all"
                        :class="visibility === 'private' ? 'bg-neon-purple/10 border-neon-purple/50' : 'bg-white/5 border-white/5 hover:border-white/20'"
                      >
                          <Lock :size="18" class="mb-2" :class="visibility === 'private' ? 'text-neon-purple' : 'text-gray-400'" />
                          <div class="text-sm font-bold text-white">Private</div>
                          <div class="text-[10px] text-gray-500">Only visible to you (initially)</div>
                      </div>
                  </div>
              </div>

              <!-- Action -->
              <button 
                  @click="create"
                  :disabled="!isValid"
                  class="w-full py-3 rounded-xl bg-neon-blue text-black font-bold hover:bg-neon-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-4"
              >
                  Create
              </button>
          </div>
      </GlassCard>
  </div>
</template>

<style scoped>
.animate-fade-scale-up {
    animation: fadeScaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeScaleUp {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
}
</style>
