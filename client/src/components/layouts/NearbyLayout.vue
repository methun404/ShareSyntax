<script setup>
import { Radar } from 'lucide-vue-next'
</script>

<template>
  <div class="h-full flex flex-col items-center justify-center p-6 relative">
    
    <!-- Radar Animation -->
    <div class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
      <div class="w-[300px] h-[300px] border border-neon-cyan/30 rounded-full animate-ping absolute"></div>
      <div class="w-[500px] h-[500px] border border-neon-cyan/20 rounded-full absolute"></div>
    </div>

    <div class="z-10 text-center mb-12">
      <div class="w-24 h-24 rounded-full bg-neon-cyan/10 flex items-center justify-center mx-auto mb-6 ring-1 ring-neon-cyan/50 shadow-[0_0_30px_rgba(0,255,242,0.2)]">
        <Radar :size="48" class="text-neon-cyan" />
      </div>
      <h2 class="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Nearby Share</h2>
      <p class="text-gray-400 mt-2">Discovering devices nearby...</p>
    </div>

    <!-- Drop Zone Placeholder -->
    <div class="w-full max-w-md h-64 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center hover:bg-white/5 transition-colors cursor-pointer">
      <p class="text-gray-400 font-medium">Drag & Drop files here</p>
      <p class="text-xs text-gray-600 mt-1">or tap to browse</p>
    </div>

  </div>
</template>
