<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useGroupStore } from '@/stores/groups'
import { useUIStore } from '@/stores/ui'
import { Plus, LogIn, Zap, Shield, Smartphone, Globe, ArrowRight, Download, User } from 'lucide-vue-next'
import JoinModal from '@/components/modals/JoinModal.vue'
import HostRoomModal from '@/components/modals/HostRoomModal.vue'

import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const groupStore = useGroupStore()
const uiStore = useUIStore()
const authStore = useAuthStore()

const isJoinModalOpen = ref(false)
const isHostModalOpen = ref(false)
const deferredPrompt = ref(null)
// Show by default so user sees it. If prompt is missing, we explain why on click.
const showInstallButton = ref(true)
const isIOS = ref(false)

const handleHost = () => {
    if (authStore.isAuthenticated) {
        // Signed-in users get a modal to name their project & choose save type
        isHostModalOpen.value = true
    } else {
        // Anonymous users: instant room creation (no save, no modal)
        groupStore.createGroup({ isTemporary: true })
        groupStore.shouldShowConnectModal = true
        uiStore.currentMode = 'chat'
    }
}

const handleInstallPWA = async () => {
    // 1. Native Install (Android/Chrome) - BEST CASE
    if (deferredPrompt.value) {
        deferredPrompt.value.prompt()
        const { outcome } = await deferredPrompt.value.userChoice
        if (outcome === 'accepted') {
            showInstallButton.value = false
        }
        deferredPrompt.value = null
        return
    }

    // 2. iOS Instructions
    if (isIOS.value) {
        alert('To install on iOS:\n1. Tap the Share button below 👇\n2. Scroll down and tap "Add to Home Screen" ➕')
        return
    }

    // 3. Fallback (Browser didn't fire event yet)
    alert('Direct install is not available right now.\n\nPossible reasons:\n- App is already installed\n- Browser is loading\n\nPlease try "Add to Home Screen" from your browser menu.')
}

const captureInstallEvent = (e) => {
    e.preventDefault()
    deferredPrompt.value = e
    showInstallButton.value = true
}

const checkDisplayMode = () => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
    if (isStandalone) {
        showInstallButton.value = false
    }
}

onMounted(() => {
    // Check iOS
    isIOS.value = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    
    // Listen for Android/Desktop prompt
    window.addEventListener('beforeinstallprompt', captureInstallEvent)
    
    // Hide if installed
    checkDisplayMode()
    window.matchMedia('(display-mode: standalone)').addEventListener('change', checkDisplayMode)
})

onBeforeUnmount(() => {
    window.removeEventListener('beforeinstallprompt', captureInstallEvent)
})
</script>

<template>
  <div class="min-h-screen w-full bg-[#050510] text-white relative overflow-x-hidden flex flex-col font-sans selection:bg-neon-blue/30 selection:text-neon-cyan">
      
      <!-- Futuristic Background Grid -->
      <div class="fixed inset-0 z-0 pointer-events-none opacity-20" 
           style="background-image: linear-gradient(rgba(46, 134, 222, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(46, 134, 222, 0.1) 1px, transparent 1px); background-size: 50px 50px; mask-image: radial-gradient(circle at center, black 40%, transparent 100%);">
      </div>

      <!-- Ambient Glows -->
      <div class="fixed top-0 left-0 w-full h-[600px] bg-[radial-gradient(circle_at_50%_-20%,rgba(46,134,222,0.25),transparent_70%)] animate-pulse-slow z-0"></div>
      <div class="fixed top-1/4 -left-32 w-96 h-96 bg-neon-purple/20 blur-[120px] rounded-full mix-blend-screen animate-float bg-blend-overlay z-0"></div>
      <div class="fixed bottom-0 -right-32 w-96 h-96 bg-neon-cyan/20 blur-[120px] rounded-full mix-blend-screen animate-float z-0" style="animation-delay: -3s"></div>

      <!-- Navbar -->
      <nav class="w-full px-4 md:px-6 py-5 flex items-center justify-between z-20 backdrop-blur-sm sticky top-0 border-b border-white/5 bg-[#050510]/50 supports-[backdrop-filter]:bg-[#050510]/20 transition-all duration-300">
          <!-- Logo -->
          <div class="flex items-center gap-3 group cursor-pointer">
              <div class="relative w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden transition-transform duration-500 group-hover:rotate-12 bg-white/5 border border-white/10 shadow-lg shadow-neon-blue/10">
                  <div class="absolute inset-0 bg-gradient-to-tr from-neon-blue/20 to-neon-purple/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <img src="@/assets/logo.png" alt="ShareSyntax Logo" class="w-6 h-6 object-contain relative z-10 drop-shadow-md" />
              </div>
              <span class="text-xl md:text-2xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-gray-400 group-hover:to-white transition-all duration-300">ShareSyntax</span>
          </div>

          <!-- Right Actions -->
          <div class="flex items-center gap-3">
              <!-- Auth Buttons -->
              <div class="flex items-center gap-2">
                  <button 
                    v-if="authStore.isAuthenticated"
                    @click="router.push('/dashboard')"
                    class="px-3 py-1.5 text-sm font-medium text-white bg-white/10 hover:bg-white/20 rounded-lg border border-white/5 transition-colors flex items-center gap-2"
                    title="Dashboard"
                  >
                        <User :size="16" class="text-neon-blue" />
                        <span class="hidden sm:inline">Dashboard</span>
                  </button>
                  <button 
                    v-else
                    @click="router.push('/auth')"
                    class="px-3 py-1.5 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                  >
                      Sign In
                  </button>
              </div>

              <div class="h-6 w-px bg-white/10 hidden md:block" v-if="showInstallButton"></div>

              <!-- Install App Button (Hidden unless PWA installable) -->
              <button 
                v-if="showInstallButton"
                @click="handleInstallPWA"
                class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neon-blue/10 hover:bg-neon-blue/20 text-neon-blue border border-neon-blue/20 transition-all duration-300 text-sm font-medium"
                title="Install App"
              >
                  <Download :size="16" />
                  <span class="hidden sm:inline">Install App</span>
              </button>
          </div>
      </nav>

      <!-- Main Content -->
      <main class="flex-1 flex flex-col items-center justify-center px-4 relative z-10 w-full max-w-7xl mx-auto py-20">
          
          <!-- Hero Section -->
          <section class="text-center max-w-4xl mx-auto mb-24 animate-fade-in-up" aria-label="Hero">
              <!-- Version Badge -->

              <!-- Main Heading -->
              <h1 class="text-5xl sm:text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-[1.1]">
                  <span class="bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/40 filter drop-shadow-sm">Real-Time</span>
                  <br /> 
                  <span class="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-neon-cyan to-neon-purple animate-gradient bg-[length:200%_auto]">Code Share & Chat</span>
              </h1>

              <p class="text-lg md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed font-light">
                  A free, instant <span class="text-white font-medium">collaborative code editor</span> with integrated <span class="text-white font-medium">tmp chat</span>. Perfect for fast text sharing, anonymous developer discussion, and pair programming.
              </p>

              <!-- Action Buttons -->
              <div class="flex flex-col sm:flex-row items-center justify-center gap-6 w-full max-w-lg mx-auto">
                  <button 
                    @click="handleHost"
                    class="w-full sm:w-auto flex-1 group relative overflow-hidden rounded-2xl p-[1px] transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(46,134,222,0.4)] hover:shadow-[0_0_60px_rgba(46,134,222,0.6)]"
                  >
                      <div class="absolute inset-0 bg-gradient-to-r from-neon-blue to-neon-purple animate-spin-slow opacity-100"></div>
                      <div class="relative bg-[#050510] h-full rounded-2xl px-8 py-4 flex items-center justify-center gap-3 transition-colors group-hover:bg-opacity-90">
                          <Plus :size="24" class="text-white group-hover:rotate-90 transition-transform duration-300" />
                          <span class="text-lg font-bold text-white tracking-wide">Host Room</span>
                          <div class="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                      </div>
                  </button>

                  <button 
                    @click="isJoinModalOpen = true"
                    class="w-full sm:w-auto flex-1 group relative overflow-hidden rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 px-8 py-4 transition-all duration-300 hover:border-neon-cyan/50 hover:shadow-[0_0_30px_rgba(0,229,255,0.2)]"
                  >
                        <div class="relative flex items-center justify-center gap-3">
                            <LogIn :size="24" class="text-neon-cyan group-hover:scale-110 transition-transform duration-300" />
                            <span class="text-lg font-bold text-white tracking-wide">Join Room</span>
                        </div>
                  </button>
              </div>
          </section>

          <!-- Feature Grid -->
          <section class="grid grid-cols-1 md:grid-cols-3 gap-6 w-full animate-fade-in-up px-4" style="animation-delay: 200ms" aria-label="Features">
              <article class="p-8 rounded-3xl bg-white/5 border border-white/5 hover:border-neon-blue/40 transition-all duration-500 backdrop-blur-xl group hover:-translate-y-2 hover:shadow-[0_10px_40px_-10px_rgba(46,134,222,0.3)]">
                  <div class="w-14 h-14 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:border-neon-blue/50 transition-all duration-500 shadow-lg">
                      <Shield :size="28" class="text-neon-blue group-hover:drop-shadow-[0_0_10px_rgba(46,134,222,0.8)] transition-all" />
                  </div>
                  <h2 class="text-xl font-bold text-white mb-3 group-hover:text-neon-blue transition-colors">Anonymous Tmp Chat</h2>
                  <p class="text-gray-400 leading-relaxed">Instantly join rooms and communicate with other developers. Your temporary chat history is secure and fast.</p>
              </article>
              
              <article class="p-8 rounded-3xl bg-white/5 border border-white/5 hover:border-neon-purple/40 transition-all duration-500 backdrop-blur-xl group hover:-translate-y-2 hover:shadow-[0_10px_40px_-10px_rgba(162,155,254,0.3)]">
                  <div class="w-14 h-14 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:border-neon-purple/50 transition-all duration-500 shadow-lg">
                      <Smartphone :size="28" class="text-neon-purple group-hover:drop-shadow-[0_0_10px_rgba(162,155,254,0.8)] transition-all" />
                  </div>
                  <h2 class="text-xl font-bold text-white mb-3 group-hover:text-neon-purple transition-colors">Live Code Editor</h2>
                  <p class="text-gray-400 leading-relaxed">Collaborate using our powerful real-time code editor. See cursors move and code execute instantly alongside your peers.</p>
              </article>

              <article class="p-8 rounded-3xl bg-white/5 border border-white/5 hover:border-neon-cyan/40 transition-all duration-500 backdrop-blur-xl group hover:-translate-y-2 hover:shadow-[0_10px_40px_-10px_rgba(0,229,255,0.3)]">
                  <div class="w-14 h-14 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:border-neon-cyan/50 transition-all duration-500 shadow-lg">
                      <Globe :size="28" class="text-neon-cyan group-hover:drop-shadow-[0_0_10px_rgba(0,229,255,0.8)] transition-all" />
                  </div>
                  <h2 class="text-xl font-bold text-white mb-3 group-hover:text-neon-cyan transition-colors">Instant Text Share</h2>
                  <p class="text-gray-400 leading-relaxed">Share text, snippets, or configs effortlessly. Generate a room link and bring everyone onto the same page without heavy signups.</p>
              </article>
          </section>

      </main>

      <!-- Footer -->
      <footer class="w-full p-8 text-center z-10 border-t border-white/5 bg-[#050510]/80 backdrop-blur-md">
          <p class="text-xs text-gray-500 font-mono tracking-widest uppercase hover:text-white transition-colors cursor-default">
              ShareSyntax Protocol • v1.0.0 • 2026
          </p>
      </footer>

      <JoinModal :isOpen="isJoinModalOpen" @close="isJoinModalOpen = false" />
      <HostRoomModal :isOpen="isHostModalOpen" @close="isHostModalOpen = false" />
  </div>
</template>

<style scoped>
.animate-pulse-slow {
  animation: pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.1; }
}
.animate-gradient {
  animation: gradient 6s linear infinite;
}
@keyframes gradient {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
</style>
