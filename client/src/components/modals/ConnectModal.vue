<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { X, QrCode, Hash, Link, Copy, Check, Share2, RefreshCw } from 'lucide-vue-next'
import QrcodeVue from 'qrcode.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import { useGroupStore } from '@/stores/groups'

const props = defineProps({
  isOpen: Boolean
})

const emit = defineEmits(['close'])

const groupStore = useGroupStore()
const activeTab = ref('qr') // 'qr' | 'pin' | 'link'
const copied = ref(false)

const roomUrl = computed(() => {
  return `${window.location.origin}/join/${groupStore.currentGroupId}`
})

const roomPin = ref(null)   // null = loading, string = value
const pinError = ref('')
const pinLoading = ref(false)
let pinTimeout = null

// ─── Persistent socket listener (registered once, not inside watch) ───
// This prevents the race condition where the server responds before
// the listener is registered.
const onPinIssued = ({ pin }) => {
  roomPin.value = pin
  pinLoading.value = false
  pinError.value = ''
  if (pinTimeout) { clearTimeout(pinTimeout); pinTimeout = null }
}

onMounted(() => {
  if (groupStore.socket) {
    groupStore.socket.on('room_pin_issued', onPinIssued)
  }
})

onBeforeUnmount(() => {
  if (groupStore.socket) {
    groupStore.socket.off('room_pin_issued', onPinIssued)
  }
  if (pinTimeout) clearTimeout(pinTimeout)
})

// Watch for modal open — request PIN each time
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    requestPin()
  } else {
    // Reset when closed
    if (pinTimeout) { clearTimeout(pinTimeout); pinTimeout = null }
  }
})

const requestPin = () => {
  if (!groupStore.socket) return
  roomPin.value = null
  pinError.value = ''
  pinLoading.value = true

  // Re-attach if socket was recreated after reconnect
  groupStore.socket.off('room_pin_issued', onPinIssued)
  groupStore.socket.on('room_pin_issued', onPinIssued)

  groupStore.socket.emit('request_room_pin', { groupId: groupStore.currentGroupId })

  // 10-second safety timeout (was 5s before — too short on bad networks)
  if (pinTimeout) clearTimeout(pinTimeout)
  pinTimeout = setTimeout(() => {
    if (pinLoading.value) {
      pinLoading.value = false
      pinError.value = 'Could not load PIN — tap retry'
    }
  }, 10000)
}

const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(roomUrl.value)
    copied.value = true
    setTimeout(() => copied.value = false, 2000)
  } catch (err) {
    console.error('Failed to copy', err)
  }
}

const tabs = [
  { id: 'qr', label: 'QR Code', icon: QrCode },
  { id: 'pin', label: 'Room PIN', icon: Hash },
  { id: 'link', label: 'Invite Link', icon: Link },
]
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
    <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-deep-black/60 backdrop-blur-sm" @click.self="emit('close')">
      
      <div class="w-full max-w-md bg-surface-dark border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative animate-scale-in">
        <!-- Close Button -->
        <button 
          @click="emit('close')" 
          class="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
        >
          <X :size="20" />
        </button>

        <!-- Header -->
        <div class="p-6 pb-0 text-center">
          <div class="w-16 h-16 mx-auto bg-neon-blue/10 rounded-2xl flex items-center justify-center mb-4 text-neon-blue ring-1 ring-neon-blue/20">
            <Share2 :size="32" />
          </div>
          <h2 class="text-2xl font-bold text-white mb-1">Quick Connect</h2>
          <p class="text-gray-400 text-sm">Share this room with others nearby</p>
        </div>

        <!-- Tabs -->
        <div class="flex p-4 gap-2">
            <button 
                v-for="tab in tabs" 
                :key="tab.id"
                @click="activeTab = tab.id"
                class="flex-1 flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-300 border"
                :class="activeTab === tab.id 
                    ? 'bg-white/5 border-neon-blue/50 text-neon-blue shadow-[0_0_15px_rgba(46,134,222,0.15)]' 
                    : 'bg-transparent border-transparent text-gray-500 hover:bg-white/5 hover:text-gray-300'"
            >
                <component :is="tab.icon" :size="20" />
                <span class="text-xs font-medium">{{ tab.label }}</span>
            </button>
        </div>

        <!-- Content Area -->
        <div class="px-6 pb-8 min-h-[220px] flex flex-col items-center justify-center">
            
            <!-- QR Code Tab -->
            <div v-if="activeTab === 'qr'" class="flex flex-col items-center animate-fade-in">
                <div class="p-4 bg-white rounded-2xl shadow-lg mb-4">
                    <QrcodeVue :value="roomUrl" :size="180" level="H" render-as="svg" foreground="#000000" background="#ffffff" />
                </div>
                <p class="text-xs text-gray-500 font-mono bg-white/5 px-3 py-1 rounded-full border border-white/5">Scan to join room</p>
            </div>

            <!-- PIN Tab -->
            <div v-if="activeTab === 'pin'" class="flex flex-col items-center w-full animate-fade-in">
                <p class="text-gray-400 mb-6 text-sm">Enter this PIN on another device to join</p>

                <!-- Loading skeleton -->
                <div v-if="pinLoading" class="flex gap-3 mb-8">
                    <div
                        v-for="i in 6"
                        :key="i"
                        class="w-10 h-14 rounded-lg border border-white/5 bg-white/5 overflow-hidden relative"
                    >
                        <div class="absolute inset-0 -translate-x-full animate-[pin-shimmer_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/8 to-transparent" :style="`animation-delay:${i*0.08}s`"></div>
                    </div>
                </div>

                <!-- PIN digits -->
                <div v-else-if="roomPin" class="flex gap-3 mb-8">
                    <div
                        v-for="(digit, i) in roomPin.split('')"
                        :key="i"
                        class="w-10 h-14 flex items-center justify-center text-2xl font-bold bg-surface-lighter rounded-lg border border-white/10 shadow-inner font-mono text-neon-cyan transition-all duration-300"
                        :style="`animation: pin-pop 0.3s ease ${i * 0.06}s both`"
                    >
                        {{ digit }}
                    </div>
                </div>

                <!-- Error + retry -->
                <div v-if="pinError" class="flex flex-col items-center gap-3 mb-4">
                    <p class="text-xs text-red-400">{{ pinError }}</p>
                    <button
                        @click="requestPin"
                        class="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs border border-white/10 transition-colors"
                    >
                        <RefreshCw :size="14" class="text-neon-blue" />
                        Retry
                    </button>
                </div>

                <div v-if="roomPin && !pinError" class="text-xs text-gray-500">PIN expires in 10 minutes</div>
            </div>

            <!-- Link Tab -->
            <div v-if="activeTab === 'link'" class="flex flex-col items-center w-full animate-fade-in">
                <p class="text-gray-400 mb-6 text-sm">Copy and share the secure invitation link</p>
                
                <div class="w-full relative group cursor-pointer" @click="copyLink">
                    <div class="w-full bg-surface-lighter border border-white/10 rounded-xl p-4 flex items-center justify-between gap-3 group-hover:border-neon-blue/30 transition-colors">
                        <div class="flex items-center gap-3 overflow-hidden">
                            <div class="p-2 bg-neon-blue/10 rounded-lg text-neon-blue">
                                <Link :size="18" />
                            </div>
                            <div class="flex flex-col min-w-0">
                                <span class="text-xs text-gray-400">Room URL</span>
                                <span class="text-sm text-white font-mono truncate">{{ roomUrl }}</span>
                            </div>
                        </div>
                        <button class="p-2 text-gray-400 group-hover:text-white transition-colors">
                             <Check v-if="copied" :size="20" class="text-success" />
                             <Copy v-else :size="20" />
                        </button>
                    </div>
                    <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-success font-medium transition-opacity duration-300" :class="copied ? 'opacity-100' : 'opacity-0'">
                        Copied to clipboard!
                    </div>
                </div>
            </div>

        </div>

      </div>
    </div>
  </Transition>
</template>
