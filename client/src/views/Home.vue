<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router' 
import { useUIStore } from '@/stores/ui'
import { useGroupStore } from '@/stores/groups'
import { useEditorStore } from '@/stores/editor'
import MainLayout from '@/components/layouts/MainLayout.vue'
import ChatLayout from '@/components/layouts/ChatLayout.vue'
import DashboardLayout from '@/components/layouts/DashboardLayout.vue'
import EditorLayout from '@/components/layouts/EditorLayout.vue'
import LandingView from '@/views/LandingView.vue'
import { Lock } from 'lucide-vue-next'

import { useAuthStore } from '@/stores/auth'
import { useProjectStore } from '@/stores/projects'

const uiStore = useUIStore()
const groupStore = useGroupStore()
const editorStore = useEditorStore()
const route = useRoute()
const authStore = useAuthStore()
const projectStore = useProjectStore()

// Skeleton loading flag — show skeleton briefly on first paint
const isBootstrapping = ref(true)

// Periodic snapshot save interval
let snapshotInterval = null

// Handle Join via URL
onMounted(async () => {
    if (route.name === 'join' && route.params.id) {
        const urlRoomId = route.params.id
        // Skip re-joining if already connected to this room (e.g. JoinModal already handled it)
        if (groupStore.currentGroupId !== urlRoomId) {
            console.log('Auto-joining group from URL:', urlRoomId)
            groupStore.joinGroup(urlRoomId)
            uiStore.currentMode = 'chat'
        }
    }

    // Start periodic snapshot saving every 30s when in a live room
    snapshotInterval = setInterval(() => {
        if (groupStore.isLiveRoom && groupStore.currentGroupId && groupStore.socket && editorStore.fileTree) {
            groupStore.socket.emit('editor:save_snapshot', {
                groupId: groupStore.currentGroupId,
                fileTree: editorStore.fileTree
            })
        }
    }, 30000)

    // Hide skeleton after a brief window — enough time for initial paint
    setTimeout(() => { isBootstrapping.value = false }, 400)
})

onUnmounted(() => {
    if (snapshotInterval) clearInterval(snapshotInterval)
})

// Dynamic component based on mode
const activeLayout = computed(() => {
  if (uiStore.currentMode === 'code') return EditorLayout
  return uiStore.currentMode === 'chat' ? ChatLayout : DashboardLayout
})
</script>

<template>
  <div class="h-[100dvh] w-full relative">

    <!-- ─── Skeleton bootstraping screen (fast network gap filler) ─── -->
    <Transition name="ss-boot" appear>
      <div
        v-if="isBootstrapping"
        class="fixed inset-0 z-[9000] bg-[#050510] flex flex-col items-center justify-center gap-6 pointer-events-none select-none"
      >
        <!-- Skeleton navbar -->
        <div class="absolute top-0 left-0 right-0 h-16 border-b border-white/5 flex items-center px-6 gap-4">
          <div class="w-8 h-8 rounded-xl bg-white/5 animate-pulse"></div>
          <div class="w-28 h-4 rounded-full bg-white/5 animate-pulse"></div>
          <div class="ml-auto flex gap-3">
            <div class="w-16 h-7 rounded-lg bg-white/5 animate-pulse"></div>
            <div class="w-20 h-7 rounded-lg bg-white/5 animate-pulse"></div>
          </div>
        </div>

        <!-- Hero skeleton -->
        <div class="flex flex-col items-center gap-5 mt-8 w-full max-w-lg px-6">
          <div class="w-3/4 h-10 rounded-2xl bg-white/5 animate-pulse"></div>
          <div class="w-1/2 h-10 rounded-2xl bg-white/[0.07] animate-pulse" style="animation-delay:0.1s"></div>
          <div class="w-full h-4 rounded-full bg-white/[0.04] animate-pulse mt-2" style="animation-delay:0.15s"></div>
          <div class="w-5/6 h-4 rounded-full bg-white/[0.04] animate-pulse" style="animation-delay:0.2s"></div>
          <div class="flex gap-4 w-full mt-4">
            <div class="flex-1 h-14 rounded-2xl bg-neon-blue/10 animate-pulse" style="animation-delay:0.25s"></div>
            <div class="flex-1 h-14 rounded-2xl bg-white/5 animate-pulse" style="animation-delay:0.3s"></div>
          </div>
        </div>

        <!-- Feature cards skeleton -->
        <div class="grid grid-cols-3 gap-4 w-full max-w-3xl px-6 mt-6">
          <div v-for="i in 3" :key="i" class="h-40 rounded-3xl bg-white/[0.03] border border-white/5 animate-pulse" :style="`animation-delay:${i*0.08}s`"></div>
        </div>
      </div>
    </Transition>

    <Transition name="fade-scale">
      <LandingView v-if="!groupStore.currentGroupId" />
      
      <MainLayout v-else>
         <component :is="activeLayout" />
      </MainLayout>
    </Transition>

    <!-- Connection Status Toast -->
    <div v-if="groupStore.currentGroupId && !groupStore.isConnected" class="fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 bg-warning text-black rounded-full text-xs font-bold shadow-lg animate-pulse">
        Connecting to server...
    </div>

    <!-- Read-Only History Mode Banner -->
    <div v-if="groupStore.currentGroupId && !groupStore.isLiveRoom" 
      class="fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-5 py-2.5 bg-[#0a0a12] border border-amber-500/30 text-amber-400 rounded-full text-xs font-bold shadow-2xl flex items-center gap-2 pointer-events-none">
      <Lock :size="13" class="shrink-0" />
      Read-Only — Saved History View
    </div>
  </div>
</template>

<style scoped>
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.3s ease;
}

.fade-scale-enter-from {
  opacity: 0;
  transform: scale(0.95);
}

.fade-scale-leave-to {
  opacity: 0;
  transform: scale(1.05);
}

/* Skeleton fade-out */
.ss-boot-leave-active {
  transition: opacity 0.4s ease;
}
.ss-boot-leave-to {
  opacity: 0;
}
</style>
