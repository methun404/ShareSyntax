<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useProjectStore } from '@/stores/projects'
import { useGroupStore } from '@/stores/groups'
import { useUIStore } from '@/stores/ui'
import { useDeviceStore } from '@/stores/devices'
import UserAvatar from '@/components/shared/UserAvatar.vue'
import JoinModal from '@/components/modals/JoinModal.vue'
import HostRoomModal from '@/components/modals/HostRoomModal.vue'
import { storeToRefs } from 'pinia'
import { 
    LogOut, User, Clock, Laptop, Plus, 
    LayoutGrid, List, Search, Settings, FolderOpen,
    ArrowRight, Monitor, MoreVertical, Pencil, Trash2,
    MessageSquare, Code2, History, Radio, Lock, Check, Save, X,
    Smartphone, Globe, Apple, Tv, Wifi, WifiOff, Share2, RefreshCw
} from 'lucide-vue-next'
import { PRESET_AVATARS, AVATAR_CATEGORIES } from '@/utils/avatars'

const router = useRouter()
const authStore = useAuthStore()
const projectStore = useProjectStore()
const groupStore = useGroupStore()
const uiStore = useUIStore()
const deviceStore = useDeviceStore()

const { user, logout } = authStore
const { projects, loading } = storeToRefs(projectStore)

const currentTab = ref('projects') // projects, devices, settings
const viewMode = ref('grid') // grid, list
const searchQuery = ref('')
const isJoinModalOpen = ref(false) 
const isHostModalOpen = ref(false)
const hostModalRef = ref(null)
const activeMenuId = ref(null)

// Device state
const { devices, loading: devicesLoading } = storeToRefs(deviceStore)
const isDeviceRenameOpen = ref(false)
const deviceToRename = ref(null)
const newDeviceName = ref('')
const copiedDeviceId = ref(null)

// Project History Panel
const selectedProject = ref(null)
const historyLoading = ref(false)
const projectHistory = ref({ messages: [], fileTree: null })
const isPanelOpen = ref(false)

// Custom Modals State
const isRenameModalOpen = ref(false)
const projectToRename = ref(null)
const newProjectName = ref('')

const isDeleteModalOpen = ref(false)
const projectToDelete = ref(null)

// Edit Profile State
const isEditingProfile = ref(false)
const editUsername = ref('')
const selectedAvatar = ref(null)
const selectedAvatarCategory = ref('all')
const profileSaving = ref(false)
const profileMessage = ref({ type: '', text: '' })

const filteredAvatars = computed(() => {
    if (selectedAvatarCategory.value === 'all') return PRESET_AVATARS
    return PRESET_AVATARS.filter(a => a.category === selectedAvatarCategory.value)
})

const startEditProfile = () => {
    editUsername.value = authStore.user?.username || ''
    selectedAvatar.value = authStore.user?.avatar || null
    profileMessage.value = { type: '', text: '' }
    isEditingProfile.value = true
}

const cancelEditProfile = () => {
    isEditingProfile.value = false
    profileMessage.value = { type: '', text: '' }
}

const handleSaveProfile = async () => {
    if (!editUsername.value.trim()) {
        profileMessage.value = { type: 'error', text: 'Username is required' }
        return
    }

    profileSaving.value = true
    profileMessage.value = { type: '', text: '' }

    try {
        await authStore.updateProfile({
            username: editUsername.value.trim(),
            avatar: selectedAvatar.value
        })
        profileMessage.value = { type: 'success', text: 'Profile updated successfully!' }
        isEditingProfile.value = false
        setTimeout(() => {
            window.location.reload()
        }, 400)
    } catch (err) {
        profileMessage.value = { type: 'error', text: err.message || 'Failed to update profile' }
    } finally {
        profileSaving.value = false
    }
}

const toggleMenu = (e, id) => {
    e.stopPropagation()
    activeMenuId.value = activeMenuId.value === id ? null : id
}

const openRenameModal = (project) => {
    projectToRename.value = project
    newProjectName.value = project.name
    isRenameModalOpen.value = true
    activeMenuId.value = null
}

const handleRename = async () => {
    if (!projectToRename.value || !newProjectName.value.trim() || newProjectName.value === projectToRename.value.name) {
        isRenameModalOpen.value = false
        return
    }

    try {
        await projectStore.renameProject(projectToRename.value.id, newProjectName.value.trim())
        isRenameModalOpen.value = false
    } catch (err) {
        alert('Failed to rename project')
    }
}

const openDeleteModal = (project) => {
    projectToDelete.value = project
    isDeleteModalOpen.value = true
    activeMenuId.value = null
}

const handleDelete = async () => {
    if (!projectToDelete.value) return

    try {
        await projectStore.deleteProject(projectToDelete.value.id)
        isDeleteModalOpen.value = false
    } catch (err) {
        alert('Failed to delete project')
    }
}

// Close menu on click outside
if (typeof window !== 'undefined') {
    window.addEventListener('click', () => {
        activeMenuId.value = null
    })
}

const handleLogout = () => {
    logout()
    router.push('/auth')
}

const handleHost = () => {
    // Open the Host Room modal — it will call createGroup + navigate when confirmed
    isHostModalOpen.value = true
}

const formatDate = (dateString) => {
    if (!dateString) return 'Just now'
    return new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const formatTime = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

const openProject = async (project) => {
    selectedProject.value = project
    isPanelOpen.value = true
    historyLoading.value = true
    projectHistory.value = { messages: [], fileTree: null }
    const hist = await projectStore.fetchRoomHistory(project.roomId)
    projectHistory.value = hist
    historyLoading.value = false
}

const closePanel = () => {
    isPanelOpen.value = false
    selectedProject.value = null
}

const handleViewHistory = (project) => {
    // Join as read-only (non-creating) — socket will return history-only room_info
    if (!groupStore.socket) groupStore.connect()
    groupStore.isCreatingRoom = false
    groupStore.currentGroupId = project.roomId
    sessionStorage.setItem('antigravity_group_id', project.roomId)
    groupStore.joinGroup(project.roomId)
    uiStore.currentMode = 'chat'
    router.push('/')
}

const handleReHostRoom = async (project) => {
    if (project.role === 'Host') {
        try {
            // Re-host the project (updates room ID in DB and returns the new id)
            const newRoomId = await projectStore.rehostProject(project.roomId)
            
            // Reset any stale state first
            groupStore.leaveGroup()
            // Mark as creating BEFORE joinGroup so isCreatingRoom=true reaches the server
            groupStore.isCreatingRoom = true
            groupStore.shouldShowConnectModal = true
            groupStore.joinGroup(newRoomId)
            uiStore.currentMode = 'chat'
            router.push('/')
        } catch (err) {
            console.error('Failed to re-host project', err)
            // Optional: Show UI toast instead of alert
            alert('Could not re-host room: ' + err.message)
        }
    } else {
        // Forking / Cloning logic for guests
        const hist = await projectStore.fetchRoomHistory(project.roomId)
        
        groupStore.leaveGroup()
        
        // Generate new room
        const newGroupId = groupStore.createGroup()
        
        // Apply the cloned fileTree immediately so editor picks it up
        if (hist && hist.fileTree) {
            groupStore.historyFileTree = hist.fileTree
        }
        
        groupStore.shouldShowConnectModal = true
        uiStore.currentMode = 'chat'
        router.push('/')
    }
}

// Filtered Projects
const filteredProjects = computed(() => {
    if (!searchQuery.value) return projects.value
    return projects.value.filter(p => 
        p.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        p.roomId.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
})

const sessions = ref([
    { id: 1, device: 'Chrome on MacOS', location: 'Dhaka, BD', lastActive: 'Now', current: true, icon: Laptop },
    // Mock data for now
])

onMounted(() => {
    if (!authStore.isAuthenticated) {
        router.push('/auth')
    } else {
        projectStore.fetchProjects()
        deviceStore.fetchDevices()
    }
})

// Device Actions
const openDeviceRename = (device) => {
    deviceToRename.value = device
    newDeviceName.value = device.device_name
    isDeviceRenameOpen.value = true
}

const handleDeviceRename = async () => {
    if (!deviceToRename.value || !newDeviceName.value.trim()) return
    await deviceStore.renameDevice(deviceToRename.value.device_id, newDeviceName.value.trim())
    isDeviceRenameOpen.value = false
    deviceToRename.value = null
}

const handleDeviceRemove = async (device) => {
    if (confirm(`Remove "${device.device_name}" from saved devices?`)) {
        await deviceStore.removeDevice(device.device_id)
    }
}

const handleQuickJoin = (device) => {
    if (!device.last_group_id) return
    groupStore.joinGroup(device.last_group_id)
    uiStore.currentMode = 'chat'
    router.push('/')
}

const copyShareLink = (device) => {
    const link = deviceStore.getShareLink(device)
    if (!link) return
    navigator.clipboard.writeText(link).then(() => {
        copiedDeviceId.value = device.device_id
        setTimeout(() => { copiedDeviceId.value = null }, 2000)
    })
}

</script>

<template>
  <div class="min-h-screen w-full bg-[#050510] text-white font-sans selection:bg-neon-blue/30 flex flex-col">
      
      <!-- Top Navigation Bar -->
      <header class="h-16 border-b border-white/5 bg-[#050510]/80 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between">
          <div class="flex items-center gap-3 cursor-pointer" @click="router.push('/')">
              <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-neon-blue/20 to-neon-purple/20 border border-white/10 flex items-center justify-center">
                  <img src="@/assets/logo.png" alt="Logo" class="w-5 h-5 object-contain" />
              </div>
              <span class="font-bold text-lg tracking-tight hidden md:block">ShareSyntax <span class="text-xs text-gray-500 font-normal ml-1">Dashboard</span></span>
          </div>

          <div class="flex items-center gap-4">
              <!-- User Menu / Profile -->
              <div class="flex items-center gap-3 pl-4 border-l border-white/5">
                  <div class="text-right hidden sm:block">
                      <div class="text-sm font-bold leading-none mb-1">{{ user?.username }}</div>
                      <div class="text-[10px] text-gray-400 leading-none">{{ user?.email }}</div>
                  </div>
                  <UserAvatar :name="user?.username || 'Guest'" :src="user?.avatar" size="md" class="w-9 h-9 ring-2 ring-white/5" />
              </div>
          </div>
      </header>

      <main class="flex-1 max-w-[1600px] w-full mx-auto p-6 md:p-10 space-y-8 animate-fade-in-up">
          
          <!-- Main Content Area with Tabs -->
          <section class="flex flex-col gap-6">
              <!-- Tabs -->
              <div class="border-b border-white/5">
                  <div class="flex gap-6">
                      <button 
                        @click="currentTab = 'projects'"
                        class="pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2"
                        :class="currentTab === 'projects' ? 'border-neon-blue text-white' : 'border-transparent text-gray-400 hover:text-gray-300'"
                      >
                          <LayoutGrid :size="16" />
                          Projects
                      </button>
                      <button
                        @click="currentTab = 'devices'; deviceStore.fetchDevices()"
                        class="pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2"
                        :class="currentTab === 'devices' ? 'border-neon-blue text-white' : 'border-transparent text-gray-400 hover:text-gray-300'"
                      >
                          <Laptop :size="16" />
                          Devices
                          <span v-if="devices?.length > 0" class="ml-1 px-1.5 py-0.5 rounded-full bg-neon-blue/20 text-neon-blue text-[10px] font-bold">{{ devices?.length }}</span>
                      </button>
                      <button 
                        @click="currentTab = 'settings'"
                        class="pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2"
                        :class="currentTab === 'settings' ? 'border-neon-blue text-white' : 'border-transparent text-gray-400 hover:text-gray-300'"
                      >
                          <Settings :size="16" />
                          Settings
                      </button>
                  </div>
              </div>

              <!-- Projects Tab -->
              <div v-show="currentTab === 'projects'" class="space-y-6">
                  <!-- Toolbar -->
                  <div class="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
                      <!-- Left: Search Bar -->
                      <div class="relative flex-1 lg:flex-initial lg:w-[800px] group">
                          <Search :size="18" class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-neon-blue transition-colors" />
                          <input 
                            v-model="searchQuery"
                            type="text" 
                            placeholder="Search projects..." 
                            class="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-xl py-2.5 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-neon-blue/50 focus:bg-white/10 focus:ring-1 focus:ring-neon-blue/20 transition-all placeholder:text-gray-600 shadow-inner"
                          />
                      </div>

                      <!-- Right: Action Buttons and View Toggle -->
                      <div class="flex items-center gap-3 w-full lg:w-auto">
                          <button 
                            @click="handleHost"
                            class="group relative overflow-hidden px-4 py-2.5 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 hover:border-neon-blue/40 text-white font-bold transition-all text-sm shadow-lg hover:shadow-neon-blue/20"
                          >
                              <div class="absolute inset-0 bg-gradient-to-r from-neon-blue/10 to-neon-purple/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                              <div class="relative flex items-center gap-2">
                                  <Plus :size="18" />
                                  <span>Host Room</span>
                              </div>
                          </button>
                          <button 
                            @click="isJoinModalOpen = true"
                            class="group relative overflow-hidden px-4 py-2.5 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 hover:border-neon-cyan/40 text-white font-bold transition-all text-sm shadow-lg hover:shadow-neon-cyan/20"
                          >
                              <div class="absolute inset-0 bg-gradient-to-r from-neon-cyan/10 to-neon-blue/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                              <div class="relative flex items-center gap-2">
                                  <ArrowRight :size="18" class="rotate-180" />
                                  <span>Join Room</span>
                              </div>
                          </button>
                          <div class="flex gap-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-1">
                              <button 
                                @click="viewMode = 'grid'" 
                                class="p-2 rounded-lg transition-all"
                                :class="viewMode === 'grid' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'"
                              >
                                  <LayoutGrid :size="18" />
                              </button>
                              <button 
                                @click="viewMode = 'list'"
                                class="p-2 rounded-lg transition-all"
                                :class="viewMode === 'list' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'"
                              >
                                  <List :size="18" />
                              </button>
                          </div>
                      </div>
                  </div>

                  <!-- Loading State -->
                  <div v-if="loading" class="py-12 text-center text-gray-400">
                      <div class="w-8 h-8 border-2 border-white/10 border-t-neon-blue rounded-full animate-spin mx-auto mb-4"></div>
                      Loading your projects...
                  </div>

                  <!-- Empty State -->
                  <div v-else-if="!filteredProjects || filteredProjects.length === 0" class="py-16 text-center border-2 border-dashed border-white/5 rounded-2xl">
                      <div class="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 text-gray-500">
                          <FolderOpen :size="32" />
                      </div>
                      <h3 class="text-lg font-bold mb-2">No projects found</h3>
                      <p class="text-gray-400 max-w-xs mx-auto mb-6">Create a new project to get started featuring real-time collaboration.</p>
                      <button @click="handleHost" class="px-6 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold transition-all">
                          Create Project
                      </button>
                  </div>

                  <!-- Grid View -->
                  <div v-else-if="viewMode === 'grid'" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div 
                        v-for="project in filteredProjects" 
                        :key="project.id"
                        @click="openProject(project)"
                        class="group bg-[#0a0a12] border border-white/5 rounded-xl p-5 hover:border-neon-blue/30 transition-all cursor-pointer relative overflow-hidden"
                      >
                          <!-- Project Link Icon -->
                          <div class="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                              <ArrowRight :size="18" class="text-neon-blue -rotate-45" />
                          </div>

                          <!-- Project Menu Trigger -->
                          <button 
                            @click="toggleMenu($event, project.id)"
                            class="absolute top-3 right-8 p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 z-20 opacity-0 group-hover:opacity-100 transition-all"
                          >
                              <MoreVertical :size="16" />
                          </button>

                          <!-- Project Menu Dropdown -->
                          <div 
                            v-if="activeMenuId === project.id"
                            class="absolute right-8 top-12 w-48 bg-[#0a0a12] border border-white/10 rounded-xl shadow-2xl z-30 overflow-hidden animate-fade-in"
                            @click.stop
                          >
                                <button 
                                  v-if="project.role === 'Host'"
                                  @click="openRenameModal(project)"
                                  class="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                                >
                                    <Pencil :size="14" /> Rename
                                </button>
                                <button 
                                  @click="openDeleteModal(project)"
                                  class="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-400/10 transition-colors"
                                >
                                    <Trash2 :size="14" /> {{ project.role === 'Host' ? 'Delete Project' : 'Remove from History' }}
                                </button>
                          </div>

                          <div class="flex items-center gap-3 mb-4">
                              <div class="p-2 rounded-lg bg-white/5 text-gray-400 group-hover:text-white transition-colors">
                                  <FolderOpen :size="20" />
                              </div>
                              <div class="min-w-0 flex-1">
                                  <h3 class="font-bold text-white leading-tight truncate pr-4">{{ project.name }}</h3>
                                  <div class="text-[10px] uppercase font-bold tracking-wider mt-0.5" 
                                       :class="project.role === 'Host' ? 'text-neon-purple' : 'text-neon-cyan'">
                                      {{ project.role }}
                                  </div>
                              </div>
                          </div>

                          <div class="space-y-2 mt-4 pt-4 border-t border-white/5">
                              <div class="flex items-center justify-between text-xs text-gray-400">
                                  <span class="flex items-center gap-1.5"><Clock :size="12" /> Last Active</span>
                                  <span>{{ formatDate(project.lastAccessed) }}</span>
                              </div>
                              <div class="flex items-center justify-between text-xs text-gray-400">
                                  <span class="flex items-center gap-1.5"><User :size="12" /> Room ID</span>
                                  <span class="font-mono text-gray-500">{{ project.roomId }}</span>
                              </div>
                          </div>
                      </div>
                  </div>

                  <!-- List View (Optional for later, using simple stacked grid for now if requested, but Grid is default) -->
                  <div v-else class="space-y-2">
                       <div 
                        v-for="project in filteredProjects" 
                        :key="project.id"
                        @click="openProject(project)"
                        class="group bg-[#0a0a12] border border-white/5 rounded-xl p-4 hover:border-neon-blue/30 transition-all cursor-pointer flex items-center justify-between relative"
                      >
                          <!-- Project Info -->
                          <div class="flex items-center gap-4">
                              <div class="p-2 rounded-lg bg-white/5 text-gray-400">
                                  <FolderOpen :size="18" />
                              </div>
                              <div>
                                  <div class="font-bold text-white">{{ project.name }}</div>
                                  <div class="text-xs text-gray-500 font-mono">ID: {{ project.roomId }}</div>
                              </div>
                          </div>
                          
                          <!-- Project Actions/Meta -->
                          <div class="flex items-center gap-4 sm:gap-8 text-sm text-gray-400">
                              <div class="hidden sm:block whitespace-nowrap">{{ formatDate(project.lastAccessed) }}</div>
                              <div class="px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-white/5" 
                                   :class="project.role === 'Host' ? 'bg-neon-purple/10 text-neon-purple' : 'bg-neon-cyan/10 text-neon-cyan'">
                                  {{ project.role }}
                              </div>
                              
                              <div class="flex items-center gap-2">
                                  <!-- Menu Trigger -->
                                  <button 
                                    @click="toggleMenu($event, project.id)"
                                    class="p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-all"
                                  >
                                      <MoreVertical :size="16" />
                                  </button>

                                  <!-- Dropdown (List View) -->
                                  <div 
                                    v-if="activeMenuId === project.id"
                                    class="absolute right-12 top-10 w-48 bg-[#0a0a12] border border-white/10 rounded-xl shadow-2xl z-30 overflow-hidden animate-fade-in"
                                    @click.stop
                                  >
                                      <button 
                                        v-if="project.role === 'Host'"
                                        @click="openRenameModal(project)"
                                        class="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors text-left"
                                      >
                                          <Pencil :size="14" /> Rename
                                      </button>
                                      <button 
                                        @click="openDeleteModal(project)"
                                        class="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-400/10 transition-colors text-left"
                                      >
                                          <Trash2 :size="14" /> {{ project.role === 'Host' ? 'Delete' : 'Remove' }}
                                      </button>
                                  </div>

                                  <ArrowRight :size="16" class="opacity-0 group-hover:opacity-100 transition-opacity text-neon-blue hidden md:block" />
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              <!-- Devices Tab -->
              <div v-show="currentTab === 'devices'" class="space-y-6">
                  <!-- Header -->
                  <div class="flex items-center justify-between">
                      <div>
                          <h2 class="text-xl font-bold">Saved Devices</h2>
                          <p class="text-gray-500 text-sm mt-1">Devices that have connected with your account. Click a device to quickly rejoin its last room.</p>
                      </div>
                      <button @click="deviceStore.fetchDevices()" class="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white text-sm transition-all">
                          <RefreshCw :size="14" />
                          Refresh
                      </button>
                  </div>

                  <!-- This Device Banner -->
                  <div class="p-4 rounded-2xl bg-gradient-to-r from-neon-blue/10 to-neon-purple/10 border border-neon-blue/20 flex items-center gap-4">
                      <div class="w-10 h-10 rounded-xl bg-neon-blue/20 border border-neon-blue/30 flex items-center justify-center text-xl">💻</div>
                      <div class="flex-1 min-w-0">
                          <div class="font-bold text-sm text-white">{{ deviceStore.deviceName }} <span class="text-[10px] text-neon-blue font-normal ml-2 px-2 py-0.5 rounded-full bg-neon-blue/10 border border-neon-blue/20">This Device</span></div>
                          <div class="text-xs text-gray-500 font-mono truncate">ID: {{ deviceStore.deviceId?.slice(0, 16) }}…</div>
                      </div>
                  </div>

                  <!-- Loading -->
                  <div v-if="devicesLoading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      <div v-for="i in 3" :key="i" class="h-36 rounded-2xl bg-white/3 border border-white/5 animate-pulse"></div>
                  </div>

                  <!-- Empty state -->
                  <div v-else-if="!devices || devices.length === 0" class="text-center py-20 text-gray-600">
                      <Laptop :size="48" class="mx-auto mb-4 opacity-20" />
                      <p class="font-bold">No saved devices yet</p>
                      <p class="text-sm mt-1">Connect from another device and it will appear here automatically.</p>
                  </div>

                  <!-- Device Cards -->
                  <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      <div
                        v-for="device in devices"
                        :key="device.device_id"
                        class="group relative p-5 rounded-2xl bg-[#0a0a12] border transition-all"
                        :class="device.device_id === deviceStore.deviceId
                            ? 'border-neon-blue/30 shadow-lg shadow-neon-blue/5'
                            : 'border-white/5 hover:border-white/15'"
                      >
                          <!-- Top row -->
                          <div class="flex items-start justify-between mb-4">
                              <div class="flex items-center gap-3">
                                  <div class="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl">
                                      {{ deviceStore.getPlatformIcon(device.platform) }}
                                  </div>
                                  <div>
                                      <div class="font-bold text-sm text-white flex items-center gap-2">
                                          {{ device.device_name }}
                                          <span v-if="device.device_id === deviceStore.deviceId" class="text-[9px] text-neon-blue font-normal px-1.5 py-0.5 rounded-full bg-neon-blue/10 border border-neon-blue/20">Current</span>
                                      </div>
                                      <div class="text-xs text-gray-500 capitalize">{{ device.platform || 'web' }}</div>
                                  </div>
                              </div>
                              <!-- Actions dropdown -->
                              <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    @click="openDeviceRename(device)"
                                    class="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                                    title="Rename"
                                  ><Pencil :size="13" /></button>
                                  <button
                                    @click="handleDeviceRemove(device)"
                                    class="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
                                    title="Remove"
                                  ><Trash2 :size="13" /></button>
                              </div>
                          </div>

                          <!-- Last seen -->
                          <div class="text-xs text-gray-600 mb-4 flex items-center gap-1.5">
                              <Clock :size="11" />
                              Last seen {{ deviceStore.formatLastSeen(device.last_seen) }}
                          </div>

                          <!-- Action Buttons -->
                          <div class="flex gap-2">
                              <button
                                v-if="device.last_group_id"
                                @click="handleQuickJoin(device)"
                                class="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-neon-blue/10 hover:bg-neon-blue/20 border border-neon-blue/20 text-neon-blue text-xs font-bold transition-all"
                              >
                                  <Wifi :size="14" />
                                  Quick Join
                              </button>
                              <button
                                v-if="device.last_group_id"
                                @click="copyShareLink(device)"
                                class="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white text-xs font-bold transition-all"
                                :title="copiedDeviceId === device.device_id ? 'Copied!' : 'Copy share link'"
                              >
                                  <span v-if="copiedDeviceId === device.device_id" class="text-green-400 text-xs">✓</span>
                                  <Share2 v-else :size="14" />
                              </button>
                              <div v-if="!device.last_group_id" class="flex-1 flex items-center gap-1.5 py-2 px-3 rounded-xl bg-white/3 border border-white/5 text-gray-600 text-xs">
                                  <WifiOff :size="14" />
                                  No room yet
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              <!-- Settings Tab -->
              <div v-show="currentTab === 'settings'" class="max-w-2xl">
                  <h2 class="text-xl font-bold mb-6">Account & Security</h2>
                  
                  <div class="space-y-6">
                       <div class="p-6 rounded-2xl bg-[#0a0a12] border border-white/5 space-y-6">
                           <div class="flex items-center justify-between">
                               <h3 class="font-bold flex items-center gap-2">
                                   <User :size="20" class="text-neon-blue" /> Profile Information
                               </h3>
                               <button 
                                 v-if="!isEditingProfile" 
                                 @click="startEditProfile" 
                                 class="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-neon-blue bg-neon-blue/10 hover:bg-neon-blue/20 border border-neon-blue/20 rounded-xl transition-all"
                               >
                                   <Pencil :size="14" /> Edit Profile
                               </button>
                           </div>

                           <!-- Alert Message -->
                           <div v-if="profileMessage.text" :class="[
                               'p-3 rounded-xl text-xs font-medium flex items-center gap-2',
                               profileMessage.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'
                           ]">
                               <span>{{ profileMessage.text }}</span>
                           </div>

                           <!-- Read-only View -->
                           <div v-if="!isEditingProfile" class="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                               <UserAvatar :name="user?.username || 'Guest'" :src="user?.avatar" size="xl" class="ring-4 ring-white/5 shrink-0" />
                               <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 w-full">
                                   <div>
                                       <label class="text-xs text-gray-500 uppercase font-bold">Username</label>
                                       <div class="mt-1 p-3 bg-white/5 rounded-lg border border-white/5 text-gray-300 font-medium">{{ user?.username }}</div>
                                   </div>
                                   <div>
                                       <label class="text-xs text-gray-500 uppercase font-bold flex items-center gap-1">
                                           Email <Lock :size="11" class="text-amber-400" />
                                       </label>
                                       <div class="mt-1 p-3 bg-white/5 rounded-lg border border-white/5 text-gray-400 font-medium flex items-center justify-between">
                                           <span>{{ user?.email }}</span>
                                           <span class="text-[10px] text-amber-400/80 bg-amber-400/10 px-2 py-0.5 rounded font-mono">Locked</span>
                                       </div>
                                   </div>
                               </div>
                           </div>

                           <!-- Editing Form -->
                           <div v-else class="space-y-6 animate-fade-in">
                               <!-- Avatar Picker -->
                               <div>
                                   <label class="text-xs text-gray-400 uppercase font-bold block mb-3">Choose Profile Picture</label>
                                   <div class="flex items-center gap-4 mb-4">
                                       <UserAvatar :name="editUsername || 'Preview'" :src="selectedAvatar" size="xl" class="ring-4 ring-neon-blue/30 shrink-0" />
                                       <div>
                                           <div class="text-sm font-bold text-white">Avatar Preview</div>
                                           <div class="text-xs text-gray-500">Pick one of default avatars or keep default initials</div>
                                           <button 
                                             v-if="selectedAvatar" 
                                             @click="selectedAvatar = null" 
                                             class="mt-2 text-xs text-red-400 hover:text-red-300 underline font-medium"
                                           >
                                               Reset to Initials
                                           </button>
                                       </div>
                                   </div>

                                   <!-- Category Tabs -->
                                   <div class="flex items-center gap-1.5 mb-3 flex-wrap">
                                       <button 
                                         type="button" 
                                         @click="selectedAvatarCategory = 'all'"
                                         class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all"
                                         :class="selectedAvatarCategory === 'all' ? 'bg-neon-blue text-white shadow-sm' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'"
                                       >
                                           All
                                       </button>
                                       <button 
                                         v-for="cat in AVATAR_CATEGORIES" 
                                         :key="cat.id" 
                                         type="button" 
                                         @click="selectedAvatarCategory = cat.id"
                                         class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all"
                                         :class="selectedAvatarCategory === cat.id ? 'bg-neon-blue text-white shadow-sm' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'"
                                       >
                                           {{ cat.name }}
                                       </button>
                                   </div>

                                   <!-- Preset Avatars Grid -->
                                   <div class="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2.5 p-3 bg-white/[0.02] border border-white/5 rounded-2xl max-h-52 overflow-y-auto">
                                       <button 
                                         v-for="av in filteredAvatars" 
                                         :key="av.id" 
                                         type="button" 
                                         @click="selectedAvatar = av.url" 
                                         class="relative w-9 h-9 rounded-full overflow-hidden border-2 transition-all group hover:scale-105"
                                         :class="selectedAvatar === av.url ? 'border-neon-blue ring-2 ring-neon-blue/50 scale-105' : 'border-white/10 hover:border-white/30'"
                                         :title="av.name"
                                       >
                                           <img :src="av.url" :alt="av.name" class="w-full h-full object-cover" />
                                           <div v-if="selectedAvatar === av.url" class="absolute inset-0 bg-neon-blue/30 flex items-center justify-center">
                                               <Check :size="14" class="text-white drop-shadow" />
                                           </div>
                                       </button>
                                   </div>
                               </div>

                               <!-- Username Edit Input & Email Readonly -->
                               <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                   <div>
                                       <label class="text-xs text-gray-400 uppercase font-bold block mb-1">Username</label>
                                       <input 
                                         v-model="editUsername" 
                                         type="text" 
                                         placeholder="Enter new username"
                                         maxlength="30"
                                         class="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/50 transition-all"
                                       />
                                   </div>

                                   <!-- Disabled Email Input -->
                                   <div>
                                       <label class="text-xs text-gray-500 uppercase font-bold block mb-1 flex items-center gap-1">
                                           Email Address
                                           <Lock :size="12" class="text-amber-400" />
                                       </label>
                                       <div class="relative">
                                           <input 
                                             :value="user?.email" 
                                             disabled 
                                             type="email" 
                                             class="w-full bg-white/5 border border-white/5 rounded-xl py-3 px-4 text-gray-500 text-sm cursor-not-allowed select-none"
                                           />
                                           <span class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-amber-400/80 bg-amber-400/10 px-2 py-0.5 rounded font-mono">
                                               Locked
                                           </span>
                                       </div>
                                       <p class="text-[11px] text-gray-500 mt-1">Email address cannot be changed</p>
                                   </div>
                               </div>

                               <!-- Save / Cancel Buttons -->
                               <div class="flex items-center gap-3 pt-2">
                                   <button 
                                     @click="handleSaveProfile" 
                                     :disabled="profileSaving"
                                     class="px-5 py-2.5 rounded-xl bg-neon-blue hover:bg-neon-blue/90 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-neon-blue/20 disabled:opacity-50"
                                   >
                                       <Save :size="15" />
                                       {{ profileSaving ? 'Saving...' : 'Save Changes' }}
                                   </button>
                                   <button 
                                     @click="cancelEditProfile" 
                                     :disabled="profileSaving"
                                     class="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-bold text-xs transition-all"
                                   >
                                       Cancel
                                   </button>
                               </div>
                           </div>
                       </div>

                      <!-- Active Sessions -->
                      <div class="p-6 rounded-2xl bg-[#0a0a12] border border-white/5">
                          <h3 class="font-bold mb-4 flex items-center gap-2">
                              <Monitor :size="20" class="text-green-400" /> Active Sessions
                          </h3>
                          <div class="space-y-3">
                              <div v-for="session in sessions" :key="session.id" class="flex items-center justify-between p-3 rounded-xl bg-white/5">
                                  <div class="flex items-center gap-3">
                                      <component :is="session.icon" :size="18" class="text-gray-400" />
                                      <div>
                                          <div class="text-sm font-bold">{{ session.device }}</div>
                                          <div class="text-xs text-gray-500">{{ session.location }} • {{ session.lastActive }}</div>
                                      </div>
                                  </div>
                                  <span v-if="session.current" class="text-[10px] font-bold bg-green-500/20 text-green-400 px-2 py-0.5 rounded">CURRENT</span>
                              </div>
                          </div>
                      </div>

                      <div class="pt-4 border-t border-white/5">
                          <button @click="handleLogout" class="text-red-400 hover:text-red-300 text-sm font-bold flex items-center gap-2 transition-colors">
                              <LogOut :size="16" /> Sign out of all devices
                          </button>
                      </div>
                  </div>
              </div>
          </section>
      </main>

      <JoinModal :isOpen="isJoinModalOpen" @close="isJoinModalOpen = false" />
      <HostRoomModal
        ref="hostModalRef"
        :isOpen="isHostModalOpen"
        @close="isHostModalOpen = false"
        @launch="router.push('/')"
      />

      <!-- Project History Side Panel Overlay -->
      <Transition name="panel">
        <div v-if="isPanelOpen" class="fixed inset-0 z-50 flex justify-end" @click.self="closePanel">
          <!-- Backdrop -->
          <div class="absolute inset-0 bg-[#050510]/70 backdrop-blur-sm" @click="closePanel"></div>

          <!-- Panel -->
          <div class="relative w-full max-w-lg bg-[#08080f] border-l border-white/10 h-full flex flex-col shadow-2xl overflow-hidden animate-slide-in">
            
            <!-- Panel Header -->
            <div class="p-6 border-b border-white/5 flex items-start justify-between gap-4">
              <div class="min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <FolderOpen :size="18" class="text-neon-blue shrink-0" />
                  <h2 class="font-bold text-lg truncate">{{ selectedProject?.name }}</h2>
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-white/5 shrink-0"
                    :class="selectedProject?.role === 'Host' ? 'bg-neon-purple/10 text-neon-purple border-neon-purple/20' : 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/20'">
                    {{ selectedProject?.role }}
                  </span>
                </div>
                <div class="text-xs text-gray-500 font-mono">{{ selectedProject?.roomId }}</div>
              </div>
              <button @click="closePanel" class="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors shrink-0">
                <ArrowRight :size="16" class="rotate-180" />
              </button>
            </div>

            <!-- Loading -->
            <div v-if="historyLoading" class="flex-1 flex items-center justify-center">
              <div class="text-center">
                <div class="w-8 h-8 border-2 border-white/10 border-t-neon-blue rounded-full animate-spin mx-auto mb-3"></div>
                <p class="text-sm text-gray-400">Loading room history...</p>
              </div>
            </div>

            <!-- Content -->
            <div v-else class="flex-1 overflow-y-auto p-6 space-y-6">

              <!-- File Snapshot -->
              <div>
                <h3 class="text-xs text-gray-500 uppercase font-bold tracking-wider mb-3 flex items-center gap-2">
                  <Code2 :size="12" /> File Snapshot
                </h3>
                <div v-if="projectHistory.fileTree && projectHistory.fileTree.children?.length" class="bg-white/3 border border-white/5 rounded-xl p-4 space-y-1.5">
                  <div v-for="file in projectHistory.fileTree.children" :key="file.id" class="flex items-center gap-2 text-sm text-gray-300">
                    <span class="text-gray-600 text-xs">{{ file.type === 'folder' ? '📁' : '📄' }}</span>
                    <span class="font-mono text-xs">{{ file.name }}</span>
                  </div>
                </div>
                <div v-else class="text-sm text-gray-600 italic">No code snapshot saved yet.</div>
              </div>

              <!-- Chat History -->
              <div>
                <h3 class="text-xs text-gray-500 uppercase font-bold tracking-wider mb-3 flex items-center gap-2">
                  <MessageSquare :size="12" /> Chat History
                  <span class="ml-auto text-gray-600 normal-case text-xs font-normal">{{ projectHistory?.messages?.length || 0 }} messages</span>
                </h3>
                <div v-if="projectHistory?.messages?.length" class="space-y-2 max-h-64 overflow-y-auto pr-1">
                  <div v-for="msg in projectHistory.messages" :key="msg.id"
                    class="flex gap-2.5 p-2.5 rounded-xl bg-white/3 border border-white/5">
                    <div class="w-6 h-6 rounded-full bg-gradient-to-br from-neon-blue/30 to-neon-purple/30 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {{ (msg.senderName || 'S').charAt(0).toUpperCase() }}
                    </div>
                    <div class="min-w-0">
                      <div class="flex items-baseline gap-2 mb-0.5">
                        <span class="text-xs font-bold text-white">{{ msg.senderName || 'Unknown' }}</span>
                        <span class="text-[10px] text-gray-600">{{ new Date(msg.timestamp).toLocaleString() }}</span>
                      </div>
                      <p class="text-sm text-gray-300 break-words">{{ typeof msg.content === 'string' ? msg.content : '[file]' }}</p>
                    </div>
                  </div>
                </div>
                <div v-else class="text-sm text-gray-600 italic">No chat messages saved yet.</div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="p-6 border-t border-white/5 space-y-3">
              <!-- Re-Host / Clone -->
              <button 
                @click="handleReHostRoom(selectedProject)"
                class="w-full group relative overflow-hidden px-4 py-3 rounded-xl bg-neon-purple/10 border border-neon-purple/30 text-neon-purple hover:bg-neon-purple/20 transition-all font-bold flex items-center justify-center gap-2">
                <Radio :size="18" class="animate-pulse" />
                {{ selectedProject?.role === 'Host' ? 'Re-Host Room (Go Live)' : 'Clone & Host as New Room' }}
              </button>

              <!-- View History (read-only) -->
              <button @click="handleViewHistory(selectedProject)"
                class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all font-bold flex items-center justify-center gap-2">
                <History :size="18" />
                View Full History (Read-Only)
              </button>

              <!-- Note for guests -->
              <p v-if="selectedProject?.role !== 'Host'" class="text-center text-xs text-gray-600 flex items-center justify-center gap-1">
                <Lock :size="11" />
                Cloning will create a new room with a new ID
              </p>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Rename Modal -->
      <div v-if="isRenameModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050510]/80 backdrop-blur-sm animate-fade-in">
          <div class="w-full max-w-md bg-[#0a0a12] border border-white/10 rounded-2xl p-6 shadow-2xl" @click.stop>
              <h3 class="text-xl font-bold mb-4 flex items-center gap-2">
                  <Pencil :size="20" class="text-neon-blue" /> Rename Project
              </h3>
              <p class="text-sm text-gray-400 mb-6">Give your project a descriptive name to keep your workspace organized.</p>
              
              <div class="space-y-4">
                  <div>
                      <label class="text-xs text-gray-500 uppercase font-bold mb-1 block">New Name</label>
                      <input 
                        v-model="newProjectName"
                        @keyup.enter="handleRename"
                        type="text" 
                        class="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-neon-blue/50 transition-all"
                        placeholder="Enter project name..."
                        autofocus
                      />
                  </div>
              </div>

              <div class="flex gap-3 mt-8">
                  <button 
                    @click="isRenameModalOpen = false"
                    class="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-all font-bold"
                  >
                      Cancel
                  </button>
                  <button 
                    @click="handleRename"
                    class="flex-1 px-4 py-2.5 rounded-xl bg-neon-blue/20 border border-neon-blue/30 text-neon-blue hover:bg-neon-blue/30 transition-all font-bold"
                  >
                      Save Changes
                  </button>
              </div>
          </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div v-if="isDeleteModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050510]/80 backdrop-blur-sm animate-fade-in">
          <div class="w-full max-w-md bg-[#0a0a12] border border-white/10 rounded-2xl p-6 shadow-2xl" @click.stop>
              <h3 class="text-xl font-bold mb-4 flex items-center gap-2 text-red-400">
                  <Trash2 :size="20" /> {{ projectToDelete?.role === 'Host' ? 'Delete Project' : 'Remove History' }}
              </h3>
              <p class="text-sm text-gray-400 mb-6">
                  {{ projectToDelete?.role === 'Host' 
                     ? "Are you sure you want to delete this project? This action is permanent and will remove the project for everyone." 
                     : "Are you sure you want to remove this project from your history? You can still join back via the room ID." 
                  }}
              </p>
              
              <div v-if="projectToDelete" class="p-4 bg-red-400/5 border border-red-400/10 rounded-xl mb-6">
                  <div class="flex items-center gap-3">
                      <FolderOpen :size="18" class="text-red-400" />
                      <div>
                          <div class="text-sm font-bold text-white">{{ projectToDelete.name }}</div>
                          <div class="text-xs text-gray-500 font-mono">{{ projectToDelete.roomId }}</div>
                      </div>
                  </div>
              </div>

              <div class="flex gap-3">
                  <button 
                    @click="isDeleteModalOpen = false"
                    class="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-all font-bold"
                  >
                      Cancel
                  </button>
                  <button 
                    @click="handleDelete"
                    class="flex-1 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all font-bold"
                  >
                      {{ projectToDelete?.role === 'Host' ? 'Delete Permanent' : 'Remove Now' }}
                  </button>
              </div>
          </div>
      </div>
      
      <!-- Device Rename Modal -->
      <div v-if="isDeviceRenameOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050510]/80 backdrop-blur-sm animate-fade-in">
          <div class="w-full max-w-md bg-[#0e0e1a] border border-white/10 rounded-2xl p-6 shadow-2xl" @click.stop>
              <h3 class="font-bold text-lg mb-1">Rename Device</h3>
              <p class="text-gray-500 text-sm mb-5">Give this device a recognizable name.</p>
              <input
                v-model="newDeviceName"
                @keyup.enter="handleDeviceRename"
                type="text"
                maxlength="50"
                placeholder="e.g. My iPhone, Work Laptop..."
                class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/20 transition-all mb-5"
                autofocus
              />
              <div class="flex gap-3 justify-end">
                  <button @click="isDeviceRenameOpen = false" class="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-gray-300 transition-all">Cancel</button>
                  <button @click="handleDeviceRename" class="px-4 py-2 rounded-xl bg-neon-blue/80 hover:bg-neon-blue text-sm font-bold text-white transition-all">Save</button>
              </div>
          </div>
      </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
    animation: fadeIn 0.2s ease-out forwards;
}

@keyframes fadeIn {
    from { opacity: 0; transform: scale(0.95) translateY(-5px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
}

@keyframes fadeInUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

.animate-slide-in {
    animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

.panel-enter-active,
.panel-leave-active {
    transition: opacity 0.25s ease;
}

.panel-enter-from,
.panel-leave-to {
    opacity: 0;
}
</style>
