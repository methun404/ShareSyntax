<script setup>
import { ref, computed, watch } from 'vue'
import { Settings, Trash2, Edit2, X, Shield, Users, Eye, EyeOff, UserX, Download } from 'lucide-vue-next'
import GlassCard from '@/components/base/GlassCard.vue'
import UserAvatar from '@/components/shared/UserAvatar.vue'
import { useGroupStore } from '@/stores/groups'
import { useEditorStore } from '@/stores/editor'

const props = defineProps({
  isOpen: Boolean,
  node: Object
})

const emit = defineEmits(['close', 'update', 'delete'])
const groupStore = useGroupStore()
const editorStore = useEditorStore()

const activeTab = ref('general')
const newName = ref(props.node?.name || '')
const localHiddenForUsers = ref([])
const localBlockedUsers = ref([])

// Helper to safely extract member ID string
const getMemberId = (member) => {
    if (!member) return ''
    return String(member.id || member._id || member.userId || '')
}

// Filter out host from member list so host manages guest permissions
const guestMembers = computed(() => {
    const hostIdStr = String(groupStore.hostId || '')
    return groupStore.members.filter(m => getMemberId(m) !== hostIdStr)
})

watch(() => props.node, (newNode) => {
    if (newNode) {
        newName.value = newNode.name
        localHiddenForUsers.value = Array.isArray(newNode.hiddenForUsers) ? [...newNode.hiddenForUsers.map(String)] : []
        localBlockedUsers.value = Array.isArray(newNode.blockedUsers) ? [...newNode.blockedUsers.map(String)] : []
    }
}, { immediate: true, deep: true })

const emitPermissionsUpdate = () => {
    if (!props.node || !groupStore.socket) return
    props.node.hiddenForUsers = [...localHiddenForUsers.value]
    props.node.blockedUsers = [...localBlockedUsers.value]

    groupStore.socket.emit('editor:node_permissions_update', {
        groupId: groupStore.currentGroupId,
        nodeId: props.node.id,
        isPrivate: props.node.isPrivate ?? false,
        hiddenForUsers: localHiddenForUsers.value,
        blockedUsers: localBlockedUsers.value
    })
}

const handleSave = () => {
    if (newName.value.trim() && newName.value !== props.node.name) {
        editorStore.renameNode(props.node.id, newName.value)
    }
    emitPermissionsUpdate()
    emit('close')
}

const handleDownload = () => {
    if (props.node && props.node.id) {
        editorStore.downloadNode(props.node.id)
        emit('close')
    }
}

const togglePrivate = () => {
    if (!props.node) return
    props.node.isPrivate = !(props.node.isPrivate ?? false)
    emitPermissionsUpdate()
}

const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${props.node.name}?`)) {
        emit('delete', props.node.id)
        emit('close')
    }
}

const toggleHideUser = (member) => {
    if (!props.node) return
    const targetId = getMemberId(member)
    if (!targetId) return
    
    const idx = localHiddenForUsers.value.findIndex(id => id === targetId)
    if (idx > -1) {
        localHiddenForUsers.value.splice(idx, 1)
    } else {
        localHiddenForUsers.value.push(targetId)
    }
    emitPermissionsUpdate()
}

const toggleBlockUser = (member) => {
    if (!props.node) return
    const targetId = getMemberId(member)
    if (!targetId) return

    const idx = localBlockedUsers.value.findIndex(id => id === targetId)
    if (idx > -1) {
        localBlockedUsers.value.splice(idx, 1)
    } else {
        localBlockedUsers.value.push(targetId)
    }
    emitPermissionsUpdate()
}

const isUserHidden = (member) => {
    const targetId = getMemberId(member)
    return localHiddenForUsers.value.includes(targetId)
}

const isUserBlocked = (member) => {
    const targetId = getMemberId(member)
    return localBlockedUsers.value.includes(targetId)
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-deep-black/80 backdrop-blur-sm">
      <GlassCard class="w-full max-w-lg p-6 relative overflow-hidden animate-fade-scale-up h-[500px] flex flex-col">
          <button @click="$emit('close')" class="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X :size="20" />
          </button>

          <h2 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Settings :size="20" class="text-neon-cyan" />
              Settings: <span class="text-neon-blue">{{ node?.name }}</span>
          </h2>

          <!-- Tabs -->
          <div class="flex border-b border-white/10 mb-4">
              <button 
                @click="activeTab = 'general'"
                class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
                :class="activeTab === 'general' ? 'border-neon-blue text-white' : 'border-transparent text-gray-400 hover:text-gray-200'"
              >General</button>
              <button 
                v-if="groupStore.isHost"
                @click="activeTab = 'permissions'"
                class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
                :class="activeTab === 'permissions' ? 'border-neon-blue text-white' : 'border-transparent text-gray-400 hover:text-gray-200'"
              >Permissions</button>
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-y-auto custom-scrollbar">
              
              <!-- General Tab -->
              <div v-if="activeTab === 'general'" class="space-y-6">
                  <!-- Rename -->
                  <div>
                      <label class="block text-xs font-medium text-gray-400 mb-2">Rename</label>
                      <div class="flex gap-2">
                          <input 
                            v-model="newName" 
                            type="text" 
                            class="flex-1 bg-deep-black/50 border border-white/10 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-neon-blue/50"
                          />
                          <button 
                            @click="handleSave"
                            class="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm font-medium transition-colors"
                          >
                              Save
                          </button>
                      </div>
                  </div>

                  <!-- Actions -->
                  <div>
                      <label class="block text-xs font-medium text-gray-400 mb-2">Actions</label>
                      <button 
                        v-if="groupStore.isHost || editorStore.permissions.canDownload"
                        @click="handleDownload"
                        class="w-full py-2.5 rounded-xl bg-neon-blue/10 text-neon-blue font-medium hover:bg-neon-blue/20 border border-neon-blue/20 transition-all flex items-center justify-center gap-2 mb-2"
                      >
                          <Download :size="16" />
                          Download {{ node?.type === 'folder' ? 'Zip' : 'File' }}
                      </button>
                      <div v-else class="text-xs text-gray-500 text-center py-2 bg-white/5 rounded-xl border border-white/5">
                          Download disabled by host
                      </div>
                  </div>

                  <!-- Danger Zone -->
                  <div class="pt-6 border-t border-white/10">
                      <h4 class="text-error font-bold text-sm mb-2">Danger Zone</h4>
                      <button 
                        @click="handleDelete"
                        class="w-full py-3 rounded-xl bg-error/10 text-error font-bold hover:bg-error/20 border border-error/50 transition-all flex items-center justify-center gap-2"
                      >
                          <Trash2 :size="18" />
                          Delete {{ node?.type === 'folder' ? 'Folder' : 'File' }}
                      </button>
                  </div>
              </div>

              <!-- Permissions Tab -->
              <div v-if="activeTab === 'permissions' && groupStore.isHost" class="space-y-4">
                  <p class="text-xs text-gray-400">Manage access control for this specific file/folder.</p>
                  
                <!-- Permissions Tab Content -->
                <div class="p-4 bg-white/5 border border-white/10 rounded-xl">
                    <div class="flex items-center justify-between">
                        <div>
                            <div class="text-sm font-medium text-white">Private File</div>
                            <div class="text-xs text-gray-500 mt-1">Only visible to host (hidden from all guests)</div>
                        </div>
                        <button 
                            @click="togglePrivate"
                            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                            :class="node?.isPrivate ? 'bg-neon-blue' : 'bg-surface-lighter'"
                        >
                            <span 
                                class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                                :class="node?.isPrivate ? 'translate-x-6' : 'translate-x-1'"
                            />
                        </button>
                    </div>
                </div>
                
                <div v-if="node?.isPrivate" class="p-3 bg-neon-blue/10 border border-neon-blue/20 rounded-xl">
                    <div class="text-xs text-neon-blue flex items-center gap-1.5">
                        🔒 This file is private — hidden from all guests
                    </div>
                </div>  
                  <div class="space-y-2">
                      <div 
                        v-for="member in guestMembers" 
                        :key="getMemberId(member)"
                        class="flex items-center justify-between p-3 rounded-xl bg-white/5"
                      >
                          <div class="flex items-center gap-3">
                              <UserAvatar :name="member.username" size="sm" />
                              <span class="text-sm text-white">{{ member.username }}</span>
                          </div>
                          
                          <div class="flex gap-2">
                              <!-- Visibility Toggle -->
                              <button 
                                @click="toggleHideUser(member)"
                                class="p-2 rounded-lg transition-colors border"
                                :class="isUserHidden(member) ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-white/10 text-gray-400 border-transparent hover:text-white'"
                                :title="isUserHidden(member) ? 'Hidden for this user (Click to Show)' : 'Visible for this user (Click to Hide)'"
                              >
                                  <component :is="isUserHidden(member) ? EyeOff : Eye" :size="16" />
                              </button>

                              <!-- Block Toggle -->
                              <button 
                                @click="toggleBlockUser(member)"
                                class="p-2 rounded-lg transition-colors border"
                                :class="isUserBlocked(member) ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-white/10 text-gray-400 border-transparent hover:text-white'"
                                :title="isUserBlocked(member) ? 'Access Blocked for this user (Click to Unblock)' : 'Access Allowed (Click to Block)'"
                              >
                                  <UserX :size="16" />
                              </button>
                          </div>
                      </div>

                      <div v-if="guestMembers.length === 0" class="text-xs text-gray-500 text-center py-4">
                          No guest users currently in room
                      </div>
                  </div>
              </div>

          </div>
      </GlassCard>
  </div>
</template>

<style scoped>
.animate-fade-scale-up {
    animation: fadeScaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeScaleUp {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
}
</style>
