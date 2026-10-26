<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUIStore } from '@/stores/ui'
import { useUserStore } from '@/stores/user'
import UserAvatar from '@/components/shared/UserAvatar.vue'
import { MessageSquare, LayoutDashboard, LogOut, FileCode, Menu, X, Share2, Users, ArrowLeft } from 'lucide-vue-next'
import { useGroupStore } from '@/stores/groups'
import { useAuthStore } from '@/stores/auth'
import { watch } from 'vue'
import ConnectModal from '@/components/modals/ConnectModal.vue'

const router = useRouter()
const uiStore = useUIStore()
const userStore = useUserStore()
const groupStore = useGroupStore()
const authStore = useAuthStore()
const isMenuOpen = ref(false)
const isConnectModalOpen = ref(false)

const currentMode = computed(() => uiStore.currentMode)

// Guard: Only allow hosts to stay in dashboard mode
watch(() => groupStore.isHost, (isHost) => {
    if (!isHost && uiStore.currentMode === 'dashboard') {
        uiStore.currentMode = 'chat'
    }
}, { immediate: true })

const handleLeave = () => {
    if (confirm('Are you sure you want to leave this room?')) {
        groupStore.leaveGroup()
        if (authStore.isAuthenticated) {
            router.push('/dashboard')
        } else {
            router.push('/')
        }
    }
}

const handleProfileClick = () => {
    isMenuOpen.value = false
    if (authStore.isAuthenticated) {
        router.push('/dashboard')
    } else {
        router.push('/auth')
    }
}

const switchMode = (mode) => {
    uiStore.currentMode = mode
    isMenuOpen.value = false
}
</script>

<template>
  <div class="flex h-[100dvh] w-full bg-deep-black text-white selection:bg-neon-cyan/20">
    <!-- Desktop Sidebar -->
    <aside class="hidden md:flex w-[96px] flex-col items-center py-8 glass z-50 transition-all duration-300 border-r border-white/5 bg-deep-black/20 backdrop-blur-2xl">
      <div class="mb-12 group relative">
        <div class="absolute inset-0 bg-neon-blue/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
        <img src="@/assets/logo.png" alt="SS" class="w-14 h-14 object-contain drop-shadow-md" />
      
      </div>

      <nav class="flex-1 flex flex-col gap-6 w-full items-center px-4">
        <!-- Chat Mode -->
        <button 
          @click="uiStore.currentMode = 'chat'"
          class="relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group overflow-hidden"
          :class="currentMode === 'chat' ? 'bg-neon-blue/15 text-neon-blue shadow-inner shadow-neon-blue/5' : 'text-gray-400 hover:text-white hover:bg-white/5'"
          title="Chat Mode"
        >
          <!-- Active Marker -->
          <div v-if="currentMode === 'chat'" class="absolute -left-4 w-1.5 h-6 bg-neon-blue rounded-r-full shadow-[0_0_12px_rgba(46,134,222,0.8)]"></div>
          <MessageSquare :size="24" class="relative z-10 transition-transform duration-300" :class="currentMode === 'chat' ? 'scale-110 drop-shadow-sm' : 'group-hover:scale-110'" />
        </button>

        <!-- Code Editor Mode -->
        <button 
          @click="uiStore.currentMode = 'code'"
          class="relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group overflow-hidden"
          :class="currentMode === 'code' ? 'bg-neon-violet/15 text-neon-violet shadow-inner shadow-neon-violet/5' : 'text-gray-400 hover:text-white hover:bg-white/5'"
          title="Code Editor"
        >
          <!-- Active Marker -->
          <div v-if="currentMode === 'code'" class="absolute -left-4 w-1.5 h-6 bg-neon-violet rounded-r-full shadow-[0_0_12px_rgba(168,85,247,0.8)]"></div>
          <FileCode :size="24" class="relative z-10 transition-transform duration-300" :class="currentMode === 'code' ? 'scale-110 drop-shadow-sm' : 'group-hover:scale-110'" />
        </button>

        <!-- Access Control Mode -->
        <button 
          v-if="groupStore.isHost"
          @click="uiStore.currentMode = 'dashboard'"
          class="relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group overflow-hidden"
          :class="currentMode === 'dashboard' ? 'bg-neon-cyan/15 text-neon-cyan shadow-inner shadow-neon-cyan/5' : 'text-gray-400 hover:text-white hover:bg-white/5'"
          title="Access Control"
        >
          <!-- Active Marker -->
          <div v-if="currentMode === 'dashboard'" class="absolute -left-4 w-1.5 h-6 bg-neon-cyan rounded-r-full shadow-[0_0_12px_rgba(0,229,255,0.8)]"></div>
          <LayoutDashboard :size="24" class="relative z-10 transition-transform duration-300" :class="currentMode === 'dashboard' ? 'scale-110 drop-shadow-sm' : 'group-hover:scale-110'" />
        </button>
      </nav>

      <div class="mt-auto flex flex-col gap-8 items-center pb-8">
        <div @click="handleProfileClick" class="relative group cursor-pointer">
           <div class="absolute inset-0 bg-neon-purple/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
           <UserAvatar :name="userStore.username" :src="userStore.avatar" size="md" class="relative ring-2 ring-transparent group-hover:ring-neon-violet/50 transition-all duration-300" />
           <!-- Online Dot -->
           <span class="absolute bottom-0 right-0 w-3.5 h-3.5 bg-success border-2 border-surface-dark rounded-full shadow-sm"></span>
        </div>
        
        <button @click="handleLeave" class="p-3 text-gray-500 hover:text-error hover:bg-error/10 rounded-2xl transition-all duration-300 group" title="Leave Room">
          <LogOut :size="22" class="group-hover:-translate-x-0.5 transition-transform" />
        </button>
      </div>
    </aside>

    <!-- Mobile Header -->
    <header class="md:hidden fixed top-0 left-0 right-0 h-16 z-[60] px-4 flex items-center justify-between glass border-b border-white/5 bg-deep-black/80 backdrop-blur-xl transition-all duration-300">
        <div class="flex items-center gap-3">
             <button @click="handleLeave" class="p-2 -ml-2 text-gray-400 hover:text-white active:scale-95 transition-transform" title="Leave Room">
                <ArrowLeft :size="22" />
             </button>
             <img src="@/assets/logo.png" alt="SS" class="w-8 h-8 object-contain" />
             <div class="flex flex-col">
                <h1 v-if="!groupStore.currentGroupId" class="text-white font-bold text-lg tracking-tight">ShareSyntax</h1>
                <h1 v-else class="text-white font-bold text-lg tracking-tight leading-none truncate max-w-[160px]">{{ groupStore.roomName }}</h1>
                <span v-if="groupStore.currentGroupId" class="text-[10px] text-gray-400 flex items-center gap-1 leading-none mt-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-success"></span>
                    {{ groupStore.members.length }} Online
                </span>
             </div>
        </div>

        <div class="flex items-center gap-2">
             <!-- Invite Button -->
            <button 
                v-if="groupStore.currentGroupId" 
                @click="isConnectModalOpen = true"
                class="p-2 text-neon-blue hover:text-white bg-neon-blue/10 hover:bg-neon-blue/20 rounded-xl transition-colors"
                title="Invite"
            >
                <Share2 :size="20" />
            </button>

            <button @click="isMenuOpen = !isMenuOpen" class="p-2 -mr-2 text-gray-300 hover:text-white active:scale-95 transition-transform">
                <Menu v-if="!isMenuOpen" :size="28" />
                <X v-else :size="28" />
            </button>
        </div>
    </header>

    <!-- Mobile Menu Overlay -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-[-10px]"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-[-10px]"
    >
      <div v-if="isMenuOpen" class="fixed inset-0 top-16 z-[55] glass bg-deep-black/95 backdrop-blur-2xl md:hidden overflow-y-auto">
         <div class="p-6 flex flex-col gap-2">
            <!-- Navigation Items -->
            <button @click="switchMode('chat')" class="flex items-center gap-4 p-4 rounded-2xl transition-all duration-200" :class="currentMode === 'chat' ? 'bg-neon-blue/10 text-neon-blue border border-neon-blue/20' : 'text-gray-400 hover:bg-white/5'">
               <MessageSquare :size="24" />
               <div class="flex flex-col items-start">
                  <span class="font-bold text-lg">Chat Room</span>
                  <span class="text-xs opacity-60">Discuss and collaborate</span>
               </div>
               <div v-if="currentMode === 'chat'" class="ml-auto w-2 h-2 rounded-full bg-neon-blue shadow-[0_0_8px_rgba(46,134,222,0.8)]"></div>
            </button>

            <button @click="switchMode('code')" class="flex items-center gap-4 p-4 rounded-2xl transition-all duration-200" :class="currentMode === 'code' ? 'bg-neon-violet/10 text-neon-violet border border-neon-violet/20' : 'text-gray-400 hover:bg-white/5'">
               <FileCode :size="24" />
               <div class="flex flex-col items-start">
                  <span class="font-bold text-lg">Code Editor</span>
                  <span class="text-xs opacity-60">Real-time coding</span>
               </div>
               <div v-if="currentMode === 'code'" class="ml-auto w-2 h-2 rounded-full bg-neon-violet shadow-[0_0_8px_rgba(168,85,247,0.8)]"></div>
            </button>

             <button 
               v-if="groupStore.isHost"
               @click="switchMode('dashboard')" 
               class="flex items-center gap-4 p-4 rounded-2xl transition-all duration-200" 
               :class="currentMode === 'dashboard' ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20' : 'text-gray-400 hover:bg-white/5'"
             >
               <LayoutDashboard :size="24" />
               <div class="flex flex-col items-start">
                  <span class="font-bold text-lg">Access Control</span>
                  <span class="text-xs opacity-60">Room controls & settings</span>
               </div>
               <div v-if="currentMode === 'dashboard'" class="ml-auto w-2 h-2 rounded-full bg-neon-cyan shadow-[0_0_8px_rgba(0,229,255,0.8)]"></div>
            </button>

            <div class="h-px bg-white/10 my-4"></div>

            <!-- Profile & Leave -->
             <div @click="handleProfileClick" class="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-all text-gray-300 cursor-pointer">
                 <UserAvatar :name="userStore.username" :src="userStore.avatar" size="md" />
                 <div class="flex flex-col">
                    <span class="font-bold">{{ userStore.username }}</span>
                    <span class="text-xs text-start text-success flex items-center gap-1">
                        <span class="w-1.5 h-1.5 rounded-full bg-success"></span>
                        Online
                    </span>
                 </div>
            </div>

            <button @click="handleLeave" class="flex items-center gap-4 p-4 rounded-2xl hover:bg-error/10 text-gray-400 hover:text-error transition-all">
                <LogOut :size="24" />
                <span class="font-bold">Leave Room</span>
            </button>
         </div>
      </div>
    </Transition>

    <!-- Content Area -->
    <main class="flex-1 overflow-hidden relative flex flex-col bg-gradient-radial from-surface-dark/50 to-deep-black pt-16 md:pt-0">
      <!-- Ambient Glow Top Right -->
      <div class="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] bg-neon-blue/5 blur-[120px] rounded-full pointer-events-none"></div>
       <!-- Ambient Glow Bottom Left -->
      <div class="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] bg-neon-violet/5 blur-[120px] rounded-full pointer-events-none"></div>

      <slot />
    </main>

    <ConnectModal :isOpen="isConnectModalOpen" @close="isConnectModalOpen = false" />
  </div>
</template>
