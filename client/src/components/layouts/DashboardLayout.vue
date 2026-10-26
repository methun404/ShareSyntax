<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useGroupStore } from '@/stores/groups'
import { useUserStore } from '@/stores/user'
import { useEditorStore } from '@/stores/editor'
import { useUIStore } from '@/stores/ui'
import GlassCard from '@/components/base/GlassCard.vue'
import UserAvatar from '@/components/shared/UserAvatar.vue'
import QrcodeVue from 'qrcode.vue'
import { 
    Users, 
    Settings, 
    Share2, 
    Copy, 
    Check, 
    Shield, 
    LogOut, 
    AlertCircle,
    Lock,
    Unlock,
    Code,
    FilePlus,
    Download
} from 'lucide-vue-next'

const groupStore = useGroupStore()
const userStore = useUserStore()
const editorStore = useEditorStore()
const uiStore = useUIStore()

const isCopied = ref(false)
const maxUsers = ref(50)

// Sync with groupStore
const isRoomLocked = ref(groupStore.isRoomLocked)
watch(() => groupStore.isRoomLocked, (val) => {
    isRoomLocked.value = val
})

// Sync permissions with editorStore
const permissions = ref({ ...editorStore.permissions })
watch(() => editorStore.permissions, (val) => {
    permissions.value = { ...val }
}, { deep: true })

const togglePermission = (key) => {
    permissions.value[key] = !permissions.value[key]
    
    // Update editor store locally
    if (editorStore.permissions) {
        editorStore.permissions[key] = permissions.value[key]
    }
    
    groupStore.addSystemMessage(`Permission '${key}' updated to ${permissions.value[key]}`)
    
    // Broadcast to room
    if (groupStore.socket) {
        groupStore.socket.emit('admin:update_permissions', {
            groupId: groupStore.currentGroupId,
            permissions: permissions.value
        })
    }
}

const roomLink = computed(() => `${window.location.origin}/join/${groupStore.currentGroupId}`)

const handleCopy = async () => {
    try {
        await navigator.clipboard.writeText(roomLink.value)
        isCopied.value = true
        setTimeout(() => isCopied.value = false, 2000)
    } catch (err) {
        console.error('Failed to copy', err)
    }
}

const handleKick = (userId) => {
    if (confirm('Remove this user from the room?')) {
        if (!groupStore.socket || !groupStore.isConnected) {
            console.warn('[KICK] Socket not connected')
            return
        }
        // Emit to server — server will handle disconnect and broadcast user_left
        groupStore.socket.emit('admin:kick_user', {
            groupId: groupStore.currentGroupId,
            targetUserId: userId
        })
        // Note: local member list will be updated when we receive 'user_left' from server
        groupStore.addSystemMessage(`User removed by host`)
    }
}

const toggleLock = () => {
    isRoomLocked.value = !isRoomLocked.value
    
    // Emit to server
    if (groupStore.socket) {
        groupStore.socket.emit('admin:lock_room', {
            groupId: groupStore.currentGroupId,
            isLocked: isRoomLocked.value
        })
    }
}

// Guard removed to allow guests to view dashboard (read-only)
onMounted(() => {
    // No redirect
})
</script>

<template>
  <div class="h-full w-full relative overflow-y-auto custom-scrollbar p-4 md:p-8">
      
      <!-- Max Width Container -->
      <div class="max-w-4xl mx-auto space-y-6">
          
          <!-- Header -->
          <div>
              <div class="flex items-center gap-3 mb-2">
                 <h1 class="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                   Access Control
                 </h1>
                 <span v-if="!groupStore.isHost" class="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-gray-400 border border-white/5 uppercase tracking-wider">
                    Guest View
                 </span>
              </div>
              <p class="text-gray-400 text-sm">Manage connectivity, users, and security settings.</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <!-- Left Col: Connection Info -->
              <div class="space-y-6">
                  <!-- QR Code Card -->
                  <GlassCard class="p-6 flex flex-col items-center text-center relative overflow-hidden group">
                      <div class="absolute inset-0 bg-gradient-to-br from-neon-blue/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      
                      <div class="mb-4 p-3 bg-white rounded-xl shadow-[0_0_30px_rgba(46,134,222,0.3)] flex items-center justify-center">
                          <QrcodeVue :value="roomLink" :size="150" level="H" />
                      </div>
                      
                      <h3 class="text-lg font-bold text-white mb-1">Room QR Code</h3>
                      <p class="text-xs text-gray-400 mb-4">Scan to join immediately</p>
                      
                      <div class="w-full relative">
                          <input 
                              type="text" 
                              :value="roomLink" 
                              readonly
                              class="w-full bg-deep-black/50 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm text-gray-300 focus:outline-none focus:border-neon-blue/50 transition-colors"
                          />
                          <button 
                              @click="handleCopy"
                              class="absolute right-2 top-2 p-1.5 rounded-lg bg-surface-light border border-white/5 text-gray-400 hover:text-white transition-all"
                          >
                              <Check v-if="isCopied" :size="16" class="text-success" />
                              <Copy v-else :size="16" />
                          </button>
                      </div>
                  </GlassCard>

                  <!-- Room Stats -->
                  <GlassCard class="p-6">
                        <h3 class="flex items-center gap-2 text-lg font-bold text-white mb-4">
                            <Shield :size="20" class="text-neon-purple" />
                            Room Settings
                        </h3>
                        
                        <div class="space-y-4">
                            <!-- Lock Toggle -->
                            <div class="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5" :class="!groupStore.isHost && 'opacity-60'">
                                <div class="flex items-center gap-3">
                                    <div class="p-2 rounded-lg bg-surface-lighter">
                                        <Lock v-if="isRoomLocked" :size="18" class="text-error" />
                                        <Unlock v-else :size="18" class="text-success" />
                                    </div>
                                    <div>
                                        <div class="text-sm font-medium text-white">Lock Room</div>
                                        <div class="text-xs text-gray-500">Prevent new users from joining</div>
                                    </div>
                                </div>
                                <button 
                                    @click="toggleLock"
                                    :disabled="!groupStore.isHost"
                                    class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:cursor-not-allowed"
                                    :class="isRoomLocked ? 'bg-error' : 'bg-surface-lighter'"
                                >
                                    <span 
                                        class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                                        :class="isRoomLocked ? 'translate-x-6' : 'translate-x-1'"
                                    />
                                </button>
                            </div>

                            <!-- Max Users -->
                            <div class="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5" :class="!groupStore.isHost && 'opacity-60'">
                                 <div class="flex items-center gap-3">
                                    <div class="p-2 rounded-lg bg-surface-lighter text-gray-400">
                                        <Users :size="18" />
                                    </div>
                                    <div>
                                        <div class="text-sm font-medium text-white">Max Participants</div>
                                        <div class="text-xs text-gray-500">Limit room capacity</div>
                                    </div>
                                </div>
                                <select 
                                    v-model="maxUsers" 
                                    :disabled="!groupStore.isHost"
                                    class="bg-deep-black border border-white/10 text-white text-sm rounded-lg focus:ring-neon-blue focus:border-neon-blue block p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <option value="10">10</option>
                                    <option value="50">50</option>
                                    <option value="100">100</option>
                                </select>
                            </div>
                        </div>
                  </GlassCard>

                  <!-- Permissions Settings -->
                  <GlassCard class="p-6">
                        <h3 class="flex items-center gap-2 text-lg font-bold text-white mb-4">
                            <Shield :size="20" class="text-neon-cyan" />
                            Permissions
                        </h3>
                        
                        <div class="space-y-4">
                            <!-- Allow Code Editing -->
                            <div class="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5" :class="!groupStore.isHost && 'opacity-60'">
                                <div class="flex items-center gap-3">
                                    <div class="p-2 rounded-lg bg-surface-lighter text-gray-400">
                                        <Code :size="18" />
                                    </div>
                                    <div>
                                        <div class="text-sm font-medium text-white">Allow Code Editing</div>
                                        <div class="text-xs text-gray-500">Guests can edit files</div>
                                    </div>
                                </div>
                                <button 
                                    @click="togglePermission('canEdit')"
                                    :disabled="!groupStore.isHost"
                                    class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:cursor-not-allowed"
                                    :class="permissions.canEdit ? 'bg-success' : 'bg-surface-lighter'"
                                >
                                    <span 
                                        class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                                        :class="permissions.canEdit ? 'translate-x-6' : 'translate-x-1'"
                                    />
                                </button>
                            </div>

                            <!-- Allow File Creation -->
                            <div class="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5" :class="!groupStore.isHost && 'opacity-60'">
                                <div class="flex items-center gap-3">
                                    <div class="p-2 rounded-lg bg-surface-lighter text-gray-400">
                                        <FilePlus :size="18" />
                                    </div>
                                    <div>
                                        <div class="text-sm font-medium text-white">Allow File Creation</div>
                                        <div class="text-xs text-gray-500">Guests can create new files</div>
                                    </div>
                                </div>
                                <button 
                                    @click="togglePermission('canCreate')"
                                    :disabled="!groupStore.isHost"
                                    class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:cursor-not-allowed"
                                    :class="permissions.canCreate ? 'bg-success' : 'bg-surface-lighter'"
                                >
                                    <span 
                                        class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                                        :class="permissions.canCreate ? 'translate-x-6' : 'translate-x-1'"
                                    />
                                </button>
                            </div>

                            <!-- Allow Downloads -->
                            <div class="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5" :class="!groupStore.isHost && 'opacity-60'">
                                <div class="flex items-center gap-3">
                                    <div class="p-2 rounded-lg bg-surface-lighter text-gray-400">
                                        <Download :size="18" />
                                    </div>
                                    <div>
                                        <div class="text-sm font-medium text-white">Allow Downloads</div>
                                        <div class="text-xs text-gray-500">Guests can download project</div>
                                    </div>
                                </div>
                                <button 
                                    @click="togglePermission('canDownload')"
                                    :disabled="!groupStore.isHost"
                                    class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:cursor-not-allowed"
                                    :class="permissions.canDownload ? 'bg-success' : 'bg-surface-lighter'"
                                >
                                    <span 
                                        class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                                        :class="permissions.canDownload ? 'translate-x-6' : 'translate-x-1'"
                                    />
                                </button>
                            </div>
                        </div>
                  </GlassCard>
              </div>

              <!-- Right Col: Users -->
              <div class="h-full">
                  <GlassCard class="h-full p-6 flex flex-col">
                      <div class="flex items-center justify-between mb-6">
                            <h3 class="flex items-center gap-2 text-lg font-bold text-white">
                                <Users :size="20" class="text-neon-cyan" />
                                Participants <span class="text-xs bg-white/10 px-2 py-0.5 rounded-full text-gray-300">{{ groupStore.members.length }}</span>
                            </h3>
                      </div>

                      <div class="flex-1 overflow-y-auto -mx-2 px-2 space-y-2 custom-scrollbar max-h-[400px] md:max-h-none">
                            <div 
                                v-for="member in groupStore.members" 
                                :key="member.id"
                                class="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group"
                            >
                                <div class="flex items-center gap-3">
                                    <UserAvatar :name="member.username" size="md" />
                                    <div>
                                        <div class="text-sm font-medium text-white flex items-center gap-2">
                                            {{ member.username }}
                                            <span v-if="String(member.id) === String(userStore.userId)" class="text-[10px] bg-neon-blue/20 text-neon-blue px-1.5 rounded uppercase font-bold tracking-wider">You</span>
                                            <span v-if="String(member.id) === String(groupStore.hostId)" class="text-[10px] bg-neon-purple/20 text-neon-purple px-1.5 rounded uppercase font-bold tracking-wider">Host</span>
                                        </div>
                                        <div class="text-xs text-gray-500">Joined {{ new Date().toLocaleTimeString() }}</div>
                                    </div>
                                </div>

                                <button 
                                    v-if="groupStore.isHost && String(member.id) !== String(userStore.userId)"
                                    @click="handleKick(member.id)"
                                    class="p-2 text-gray-600 hover:text-error hover:bg-error/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                    title="Remove User"
                                >
                                    <LogOut :size="16" />
                                </button>
                            </div>
                      </div>
                  </GlassCard>
              </div>

          </div>
      </div>
  </div>
</template>
