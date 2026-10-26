<script setup>
import { ref, watch, onBeforeUnmount, nextTick } from 'vue'
import { X, ArrowRight, Hash } from 'lucide-vue-next'
import { useGroupStore } from '@/stores/groups'
import { useUIStore } from '@/stores/ui'
import { Html5Qrcode } from 'html5-qrcode'

import { useAuthStore } from '@/stores/auth'
import { useProjectStore } from '@/stores/projects'
import { useRouter } from 'vue-router'

const props = defineProps({
  isOpen: Boolean
})

const emit = defineEmits(['close'])

const groupStore = useGroupStore()
const uiStore = useUIStore()
const authStore = useAuthStore()
const projectStore = useProjectStore()
const router = useRouter()

const roomId = ref('')
const error = ref('')
const mode = ref('input') // 'input' | 'scan'
const isScanning = ref(false)
const isJoining = ref(false)
let html5QrCode = null

// Watch for server-side join rejection errors from the store
watch(() => groupStore.joinError, (val) => {
  if (val) {
    error.value = val
    groupStore.joinError = null // clear after showing
  }
})

const handleJoin = () => {
    let input = roomId.value.trim()
    if (!input) {
        error.value = 'Please enter a Room ID'
        return
    }
    error.value = '' // clear previous error
    groupStore.joinError = null

    // Handle full URLs if pasted
    if (input.includes('/join/')) {
        const parts = input.split('/join/')
        input = parts[parts.length - 1]
    }
    // Handle query params or hashes just in case (basic cleanup)
    input = input.split('?')[0].split('#')[0]

    joinRoom(input)
}

const joinRoom = async (id) => {
    if (isJoining.value) return
    isJoining.value = true

    groupStore.joinGroup(id)
    uiStore.currentMode = 'chat'
    stopScanner()
    emit('close')
    roomId.value = ''
    error.value = ''
    // NOTE: Do NOT call router.push() here — it would re-mount Home.vue,
    // drop the socket connection, and break the session.
    // For PIN joins (6 digits): room_mapped event in groups.js will update the URL correctly.
    // For direct Room ID joins: update URL immediately via replaceState.
    const isPin = /^\d{6}$/.test(id)
    if (!isPin) {
        const actualRoomId = groupStore.currentGroupId
        if (window.location.pathname !== `/join/${actualRoomId}`) {
            window.history.replaceState({}, '', `/join/${actualRoomId}`)
        }
    }

    setTimeout(() => {
        isJoining.value = false
    }, 1000)
}

const toggleMode = async () => {
    mode.value = mode.value === 'input' ? 'scan' : 'input'
    error.value = ''
    
    if (mode.value === 'scan') {
        await nextTick()
        startScanner()
    } else {
        stopScanner()
    }
}

const startScanner = async () => {
    isScanning.value = true
    try {
        html5QrCode = new Html5Qrcode("qr-reader")
        await html5QrCode.start(
            { facingMode: "environment" },
            {
                fps: 10,
                qrbox: { width: 250, height: 250 }
            },
            (decodedText, decodedResult) => {
                // Success
                console.log(`Scan success: ${decodedText}`, decodedResult)
                // Assuming URL format: http://.../join/ROOM_ID or just ROOM_ID
                let id = decodedText
                if (decodedText.includes('/join/')) {
                    const parts = decodedText.split('/join/')
                    id = parts[parts.length - 1]
                }
                joinRoom(id)
            },
            (errorMessage) => {
                // Parse error, ignore usually
            }
        )
    } catch (err) {
        console.error("Error starting scanner", err)
        error.value = "Camera access failed. Please use manual entry."
        isScanning.value = false
    }
}

const stopScanner = () => {
    if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
            html5QrCode.clear()
            isScanning.value = false
        }).catch(err => {
            console.error("Failed to stop scanner", err)
        })
    }
}

onBeforeUnmount(() => {
    stopScanner()
})

const close = () => {
    stopScanner()
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
    <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-deep-black/80 backdrop-blur-md" @click.self="emit('close')">
      
      <div class="w-full max-w-sm bg-surface-dark border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative animate-scale-in">
        <!-- Close -->
        <button 
          @click="close" 
          class="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
        >
          <X :size="20" />
        </button>

        <div class="p-8">
            <h2 class="text-2xl font-bold text-white mb-2">Join Room</h2>
            <p class="text-gray-400 text-sm mb-8">Enter the Room ID or scan a QR code to connect with others.</p>

            <div v-if="mode === 'input'" class="space-y-4 animate-fade-in">
                <div class="relative group">
                    <div class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-neon-cyan transition-colors">
                        <Hash :size="20" />
                    </div>
                    <input 
                        v-model="roomId"
                        type="text" 
                        placeholder="Enter Room ID"
                        @keydown.enter="handleJoin"
                        @input="error = ''"
                        class="w-full bg-deep-black/50 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/50 transition-all font-mono tracking-wider"
                    />
                </div>
                
                <p v-if="error" class="text-error text-xs ml-1">{{ error }}</p>

                <button 
                    @click="handleJoin"
                    class="w-full bg-neon-cyan/10 hover:bg-neon-cyan/20 border border-neon-cyan/20 text-neon-cyan font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95"
                >
                    <span>Connect</span>
                    <ArrowRight :size="18" />
                </button>
            </div>

            <!-- Scanner View -->
            <div v-else class="flex flex-col items-center animate-fade-in">
                <div id="qr-reader" class="w-full h-64 bg-black rounded-xl overflow-hidden mb-4 border border-white/10 relative">
                     <div v-if="!isScanning" class="absolute inset-0 flex items-center justify-center text-gray-500 text-xs">
                        Initializing Camera...
                     </div>
                </div>
                <p class="text-xs text-gray-400 mb-4 text-center">Point your camera at a room QR code</p>
                <p v-if="error" class="text-error text-xs mb-2">{{ error }}</p>
            </div>
            
            <div class="mt-6 flex items-center justify-center">
                 <button 
                    @click="toggleMode"
                    class="text-xs text-gray-500 hover:text-white underline decoration-gray-700 underline-offset-4 transition-colors"
                >
                    {{ mode === 'input' ? 'Scan QR Code' : 'Enter ID Manually' }}
                </button>
            </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
