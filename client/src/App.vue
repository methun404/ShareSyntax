<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'

// PWA auto-update: detects when a new service worker is installed and reloads
const { needRefresh, updateServiceWorker } = useRegisterSW({
  onRegistered(r) {
    // Poll for SW updates every 60 seconds
    r && setInterval(() => r.update(), 60 * 1000)
  },
  onOfflineReady() {
    console.log('[PWA] App ready to work offline')
  }
})

const updateReady = ref(false)

// When new SW is waiting, show toast then auto-reload
watch(needRefresh, (val) => {
  if (val) {
    updateReady.value = true
    setTimeout(() => {
      updateServiceWorker(true) // skipWaiting + reload
    }, 1500)
  }
})

onMounted(() => {
  // Dismiss the inline splash screen once Vue app is ready
  const splash = document.getElementById('ss-splash')
  if (splash) {
    setTimeout(() => {
      splash.classList.add('ss-hidden')
      setTimeout(() => splash.remove(), 600)
    }, 300)
  }
})
</script>

<template>
  <div class="min-h-screen w-full bg-deep-black text-white relative">
    <!-- Background Gradient Blob Effect -->
    <div class="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-neon-blue/10 rounded-full blur-[120px] pointer-events-none"></div>
    <div class="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-neon-violet/10 rounded-full blur-[120px] pointer-events-none"></div>

    <RouterView v-slot="{ Component, route }">
      <Transition name="page">
        <component :is="Component" :key="route.fullPath" />
      </Transition>
    </RouterView>

    <!-- PWA Update Toast — appears briefly then auto-reloads -->
    <Transition name="toast">
      <div
        v-if="updateReady"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-3 rounded-2xl border border-white/10 bg-black/80 backdrop-blur-xl shadow-2xl text-sm text-white whitespace-nowrap"
      >
        <div class="w-2 h-2 rounded-full bg-neon-blue animate-pulse shrink-0"></div>
        <span>Updating to the latest version…</span>
      </div>
    </Transition>
  </div>
</template>

<style>
/* Global Transition Styles */
.page-enter-active,
.page-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.page-enter-from {
  opacity: 0;
  transform: scale(0.95);
  filter: blur(4px);
}

.page-leave-to {
  opacity: 0;
  transform: scale(1.05);
  filter: blur(4px);
}

/* Update toast animation */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}
</style>
