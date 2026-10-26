<script setup>
import { ref, watch, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useGroupStore } from '@/stores/groups'
import { useUserStore } from '@/stores/user'
import GlassCard from '@/components/base/GlassCard.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import FileCard from '@/components/shared/FileCard.vue'
import UserAvatar from '@/components/shared/UserAvatar.vue'
import ConnectModal from '@/components/modals/ConnectModal.vue'
import { Send, MoreVertical, Loader2, Share2, LogOut, ArrowLeft, MessageSquare, Copy, Check } from 'lucide-vue-next'

const groupStore = useGroupStore()
const userStore = useUserStore()
const authStore = useAuthStore()
const router = useRouter()

const messageInput = ref('')
const messagesContainer = ref(null)
const isConnectModalOpen = ref(false)

const isUserScrollingMode = ref(false)
const copiedMessageId = ref(null)

const copyToClipboard = async (text, id) => {
  try {
    await navigator.clipboard.writeText(text)
    copiedMessageId.value = id
    setTimeout(() => {
      if (copiedMessageId.value === id) {
        copiedMessageId.value = null
      }
    }, 2000)
  } catch (err) {
    console.error('Failed to copy: ', err)
  }
}

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

const handleSend = () => {
  if (!messageInput.value.trim()) return
  groupStore.sendMessage(messageInput.value)
  messageInput.value = ''
  // scrollToBottom now handled by watcher
}

const handleScroll = () => {
  if (!messagesContainer.value) return
  const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value
  // If user is within 100px of bottom, consider them "at bottom"
  const nearBottom = scrollHeight - scrollTop - clientHeight < 100
  isUserScrollingMode.value = !nearBottom
}

const scrollToBottom = async (force = false) => {
  await nextTick()
  if (messagesContainer.value) {
    const lastMessage = groupStore.messages[groupStore.messages.length - 1]
    const isSelf = lastMessage && lastMessage.senderId === userStore.userId
    
    // Scroll if: 
    // 1. Forced (init or file)
    // 2. It's a self message
    // 3. User is already at the bottom
    if (force || isSelf || !isUserScrollingMode.value) {
      const behavior = (force || isSelf) ? 'auto' : 'smooth'
      messagesContainer.value.scrollTo({
        top: messagesContainer.value.scrollHeight,
        behavior
      })
    }
  }
}

// Watch messages deeply to catch file loads/updates
watch(() => groupStore.messages, () => scrollToBottom(false), { deep: true })

onMounted(() => {
  scrollToBottom(true)
  // If user just created this room (Hosted), open the connect modal automatically
  if (groupStore.shouldShowConnectModal) {
     isConnectModalOpen.value = true
     groupStore.shouldShowConnectModal = false
  }
})
</script>

<template>
  <div class="h-full flex flex-col relative w-full overflow-hidden">
    
    <!-- Top Bar: Sticky and Glass -->
    <div class="flex-none hidden md:block px-4 py-3 md:px-6 md:py-4 glass z-20 sticky top-0 border-b border-white/5 bg-deep-black/30 backdrop-blur-xl">
      <div class="flex items-center justify-between w-full max-w-7xl mx-auto">
        <!-- Header content including Leave Button -->
        <div class="flex items-center gap-3 min-w-0">
          <!-- Back / Leave Button -->
          <button 
            @click="handleLeave" 
            class="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200 shrink-0" 
            title="Leave Room"
          >
            <ArrowLeft :size="20" />
          </button>

          <!-- Room Info -->
          <div class="flex flex-col justify-center min-w-0">
             <div class="flex items-center gap-2">
                <Hash :size="18" class="text-neon-cyan shrink-0" />
                <h2 class="font-bold text-white text-base md:text-lg leading-tight truncate">{{ groupStore.roomName }}</h2>
                <span class="hidden md:inline-block px-2 py-0.5 bg-neon-blue/10 border border-neon-blue/20 rounded-md text-[10px] text-neon-blue font-bold uppercase tracking-wider">Active</span>
             </div>
             <div class="flex items-center gap-2 mt-0.5">
                <div class="flex items-center gap-1.5">
                   <span class="relative flex h-2 w-2">
                     <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                     <span class="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                   </span>
                   <span class="text-xs text-gray-400 font-medium whitespace-nowrap">{{ groupStore.members.length }} participants</span>
                </div>
             </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button 
            @click="isConnectModalOpen = true"
            class="shrink-0 flex items-center gap-2 px-3 py-2 md:px-5 md:py-2.5 bg-neon-blue/10 hover:bg-neon-blue/20 text-neon-blue border border-neon-blue/20 rounded-xl transition-all duration-300 shadow-lg hover:shadow-neon-blue/10 group"
          >
            <Share2 :size="18" class="group-hover:scale-110 transition-transform" />
            <span class="hidden sm:inline font-bold text-sm tracking-wide">Invite</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Messages Area -->
    <div class="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar" ref="messagesContainer" @scroll="handleScroll">
      <div class="max-w-5xl mx-auto space-y-6 pb-4">
        
        <!-- Empty State -->
        <div v-if="groupStore.messages.length === 0" class="flex flex-col items-center justify-center py-20 text-center opacity-0 animate-fade-in" style="animation-delay: 0.2s; animation-fill-mode: forwards;">
           <div class="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-center mb-6 relative group">
              <div class="absolute inset-0 bg-neon-blue/20 blur-xl rounded-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
              <MessageSquare :size="32" class="text-gray-500 md:text-gray-400 relative z-10 transition-colors group-hover:text-neon-blue" />
           </div>
           <h3 class="text-lg md:text-xl font-bold text-white mb-2">No messages yet</h3>
           <p class="text-gray-400 text-sm md:text-base max-w-xs mx-auto leading-relaxed">It's quiet in here.<br>Be the first to break the silence!</p>
        </div>

        <TransitionGroup name="message-pop">
           <div v-for="(msg, index) in groupStore.messages" :key="msg.id || index" class="message-wrapper">
              <!-- System Message -->
              <div v-if="msg.type === 'system'" class="flex justify-center my-4">
                 <span class="px-3 py-1 bg-white/5 border border-white/5 rounded-full text-xs text-gray-400 font-medium backdrop-blur-sm shadow-sm">
                    {{ msg.text }}
                 </span>
              </div>

              <!-- User Message -->
              <div v-else class="flex gap-4 group" :class="msg.isSelf ? 'flex-row-reverse' : ''">
                 <UserAvatar :name="msg.senderName" size="sm" class="mt-1 shadow-lg shrink-0" />
                 
                  <div 
                    class="flex flex-col gap-1 max-w-[75%] md:max-w-[60%] relative group/message"
                    :class="msg.isSelf ? 'items-end' : 'items-start'"
                  >
                    <div class="flex items-center gap-2" :class="msg.isSelf ? 'flex-row-reverse' : ''">
                       <span class="text-xs font-bold text-gray-400">{{ msg.senderName }}</span>
                       <span class="text-[10px] text-gray-600">{{ new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }}</span>
                    </div>

                     <div class="relative">
                        <div 
                           class="rounded-xl p-3 md:p-4 pb-9 md:pb-4 shadow-sm backdrop-blur-sm transition-all duration-300"
                           :class="[
                              msg.isSelf 
                                 ? 'bg-gradient-to-br from-neon-blue/90 to-neon-purple/90 text-white rounded-tr-sm' 
                                 : 'bg-white/10 text-gray-100 rounded-tl-sm border border-white/5 hover:bg-white/15'
                           ]"
                        >
                           <!-- Text Content -->
                           <p 
                             v-if="msg.text" 
                             class="text-sm md:text-base whitespace-pre-wrap leading-relaxed"
                             :class="msg.isSelf ? 'text-right' : 'text-left'"
                           >
                             {{ msg.text }}
                           </p>

                           <!-- File Attachment -->
                           <FileCard v-if="msg.file" :file="msg.file" :isSelf="msg.isSelf" />
                        </div>

                        <!-- Copy Button (Mobile: Fixed Bottom, Desktop: Hover) -->
                        <button 
                          v-if="msg.text"
                          @click="copyToClipboard(msg.text, msg.id || index)"
                          class="absolute transition-all duration-200 p-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-white border border-white/10 backdrop-blur-md z-20 shadow-xl
                                 opacity-100 bottom-1 
                                 md:opacity-0 md:bottom-auto md:top-2 md:group-hover/message:opacity-100"
                          :class="[
                            msg.isSelf 
                              ? 'right-1 md:right-auto md:-left-10' 
                              : 'left-1 md:left-auto md:-right-10'
                          ]"
                          :title="copiedMessageId === (msg.id || index) ? 'Copied!' : 'Copy to clipboard'"
                        >
                           <Check v-if="copiedMessageId === (msg.id || index)" :size="14" class="text-green-400" />
                           <Copy v-else :size="14" />
                        </button>
                     </div>
                  </div>
               </div>
           </div>
        </TransitionGroup>
      </div>
    </div>

    <!-- Input Area -->
    <div class="flex-none p-4 md:p-6 glass border-t border-white/5 bg-deep-black/30 backdrop-blur-xl z-20 pb-4 md:pb-8">
      <div class="max-w-5xl mx-auto">
         <div 
            class="relative flex items-center gap-2 p-1.5 rounded-2xl bg-deep-black/40 border border-white/10 transition-all duration-300 focus-within:border-neon-blue/20 focus-within:bg-deep-black/60 shadow-lg"
         >
            <!-- Text Input -->
            <textarea 
              v-model="messageInput"
              @keydown.enter.prevent="handleSend"
              :placeholder="!groupStore.isLiveRoom ? 'Read-only history mode' : 'Type a message...'"
              :disabled="!groupStore.isLiveRoom"
              class="w-full bg-transparent border-none text-white placeholder-gray-500 focus:ring-0 resize-none py-3 max-h-32 custom-scrollbar leading-relaxed text-sm md:text-base disabled:opacity-50"
              rows="1"
              style="min-height: 46px;" 
            ></textarea>

            <!-- Send Button -->
            <button 
              @click="handleSend"
              class="p-2.5 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden shrink-0 mr-1"
              :class="messageInput.trim() && groupStore.isLiveRoom ? 'bg-neon-blue text-white shadow-lg shadow-neon-blue/20 hover:bg-neon-blue/90' : 'bg-transparent text-gray-500 hover:bg-white/5'"
              :disabled="!messageInput.trim() || !groupStore.isLiveRoom"
            >
               <Send :size="20" class="relative z-10 transition-transform duration-300" :class="messageInput.trim() && groupStore.isLiveRoom ? 'translate-x-0.5' : ''" />
            </button>
         </div>
      </div>
    </div>
    
    <ConnectModal :isOpen="isConnectModalOpen" @close="isConnectModalOpen = false" />
  </div>
</template>
