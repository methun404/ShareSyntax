<script setup>
import { ref, computed } from 'vue'
import { X, FolderPlus, Zap, Save, Clock } from 'lucide-vue-next'
import { useGroupStore } from '@/stores/groups'
import { useUIStore } from '@/stores/ui'

const props = defineProps({
  isOpen: Boolean
})
const emit = defineEmits(['close', 'launch'])

const groupStore = useGroupStore()
const uiStore = useUIStore()

const projectName = ref('')
const saveType = ref('save') // 'save' | 'temporary'
const isCreating = ref(false)

const effectiveName = computed(() =>
  projectName.value.trim() || `Project ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`
)

const handleCreate = () => {
  if (isCreating.value) return
  isCreating.value = true

  const isTemporary = saveType.value === 'temporary'
  const name = effectiveName.value

  groupStore.createGroup({ projectName: name, isTemporary })
  groupStore.shouldShowConnectModal = true
  uiStore.currentMode = 'chat'

  // Reset & close
  projectName.value = ''
  saveType.value = 'save'
  isCreating.value = false
  emit('close')
  emit('launch')  // parent (e.g. Dashboard) can react with router.push('/')
}

const close = () => {
  if (isCreating.value) return
  projectName.value = ''
  saveType.value = 'save'
  emit('close')
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-deep-black/60 backdrop-blur-sm"
      @click.self="close"
    >
      <div class="w-full max-w-md bg-surface-dark border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative animate-scale-in">

        <!-- Close Button -->
        <button
          @click="close"
          class="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
        >
          <X :size="20" />
        </button>

        <!-- Header -->
        <div class="p-6 pb-0 text-center">
          <div class="w-16 h-16 mx-auto bg-neon-blue/10 rounded-2xl flex items-center justify-center mb-4 text-neon-blue ring-1 ring-neon-blue/20">
            <FolderPlus :size="32" />
          </div>
          <h2 class="text-2xl font-bold text-white mb-1">Host a Room</h2>
          <p class="text-gray-400 text-sm">Configure your session before starting</p>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-5">

          <!-- Project Name -->
          <div class="space-y-2">
            <label class="text-xs font-semibold text-gray-400 uppercase tracking-widest">Project Name</label>
            <div class="relative group">
              <input
                v-model="projectName"
                type="text"
                placeholder="e.g. Code Review, Bug Hunt…"
                @keydown.enter="handleCreate"
                maxlength="60"
                class="w-full bg-deep-black/50 border border-white/10 rounded-xl py-4 px-4 text-white placeholder-gray-600 focus:outline-none focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/50 transition-all text-sm"
              />
            </div>
            <p class="text-[11px] text-gray-600 pl-1">
              Leave empty →
              <span class="text-gray-400 font-mono">{{ effectiveName }}</span>
            </p>
          </div>

          <!-- Session Type -->
          <div class="space-y-2">
            <label class="text-xs font-semibold text-gray-400 uppercase tracking-widest">Session Type</label>
            <div class="grid grid-cols-2 gap-3">

              <!-- Save to Dashboard -->
              <button
                @click="saveType = 'save'"
                :class="[
                  'relative flex flex-col items-start gap-2 p-4 rounded-xl border transition-all duration-200 text-left',
                  saveType === 'save'
                    ? 'border-neon-blue/50 bg-neon-blue/10 shadow-[0_0_15px_rgba(46,134,222,0.15)]'
                    : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20'
                ]"
              >
                <div :class="['absolute top-3 right-3 w-2 h-2 rounded-full transition-all', saveType === 'save' ? 'bg-neon-blue shadow-[0_0_6px_rgba(46,134,222,0.8)]' : 'bg-white/15']"></div>
                <div :class="['w-8 h-8 rounded-lg flex items-center justify-center transition-colors', saveType === 'save' ? 'bg-neon-blue/20' : 'bg-white/5']">
                  <Save :size="16" :class="saveType === 'save' ? 'text-neon-blue' : 'text-gray-500'" />
                </div>
                <div>
                  <p :class="['text-sm font-semibold leading-tight', saveType === 'save' ? 'text-white' : 'text-gray-400']">Save to Dashboard</p>
                  <p class="text-[11px] text-gray-500 mt-0.5 leading-relaxed">History &amp; files saved to your account</p>
                </div>
              </button>

              <!-- Temporary -->
              <button
                @click="saveType = 'temporary'"
                :class="[
                  'relative flex flex-col items-start gap-2 p-4 rounded-xl border transition-all duration-200 text-left',
                  saveType === 'temporary'
                    ? 'border-neon-purple/50 bg-neon-purple/10 shadow-[0_0_15px_rgba(162,155,254,0.15)]'
                    : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20'
                ]"
              >
                <div :class="['absolute top-3 right-3 w-2 h-2 rounded-full transition-all', saveType === 'temporary' ? 'bg-neon-purple shadow-[0_0_6px_rgba(162,155,254,0.8)]' : 'bg-white/15']"></div>
                <div :class="['w-8 h-8 rounded-lg flex items-center justify-center transition-colors', saveType === 'temporary' ? 'bg-neon-purple/20' : 'bg-white/5']">
                  <Clock :size="16" :class="saveType === 'temporary' ? 'text-neon-purple' : 'text-gray-500'" />
                </div>
                <div>
                  <p :class="['text-sm font-semibold leading-tight', saveType === 'temporary' ? 'text-white' : 'text-gray-400']">Temporary</p>
                  <p class="text-[11px] text-gray-500 mt-0.5 leading-relaxed">Session only — nothing saved to dashboard</p>
                </div>
              </button>

            </div>
          </div>

          <!-- Launch Button -->
          <button
            @click="handleCreate"
            :disabled="isCreating"
            class="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-bold text-white bg-neon-blue/10 hover:bg-neon-blue/20 border border-neon-blue/20 hover:border-neon-blue/40 hover:shadow-[0_0_20px_rgba(46,134,222,0.2)] transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Zap :size="18" class="text-neon-blue" />
            {{ isCreating ? 'Creating…' : 'Launch Room' }}
          </button>

        </div>
      </div>
    </div>
  </Transition>
</template>
