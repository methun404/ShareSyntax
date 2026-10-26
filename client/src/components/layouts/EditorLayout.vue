<script setup>
import { useEditorStore } from '@/stores/editor'
import { useGroupStore } from '@/stores/groups'
import FileTree from '@/components/editor/FileTree.vue'
import MonacoEditor from '@/components/editor/MonacoEditor.vue'
import CreateNodeModal from '@/components/editor/modals/CreateNodeModal.vue'
import NodeSettingsModal from '@/components/editor/modals/NodeSettingsModal.vue'
import { FileCode, FolderClosed, Plus, X, Menu, Terminal, FilePlus, FolderPlus, Download } from 'lucide-vue-next'
import { ref, onMounted, watch } from 'vue'

const editorStore = useEditorStore()
const groupStore = useGroupStore()
const isSidebarOpen = ref(true)
const isCreateModalOpen = ref(false)
const isSettingsModalOpen = ref(false)

const createModalType = ref('file')
const activeNodeForSettings = ref(null)

// Init listeners when socket is ready
const initListeners = () => {
    if (groupStore.socket) {
        editorStore.initSocketListeners()
    }
}

onMounted(() => {
    initListeners()
})

// Watch for socket connection (e.g. on page refresh)
watch(() => groupStore.socket, (newSocket) => {
    if (newSocket) {
        editorStore.initSocketListeners()
    }
})

const toggleSidebar = () => isSidebarOpen.value = !isSidebarOpen.value

const handleFileSelect = () => {
    // Check if mobile (using rough width check or just always close if it's overlay functionality)
    // Better: check window width
    if (window.innerWidth < 768) {
        isSidebarOpen.value = false
    }
}

const openCreateModal = (type) => {
    if (!groupStore.isLiveRoom) {
        alert("This is a read-only history view. You cannot create files.")
        return
    }
    if (!editorStore.permissions.canCreate) {
        alert("You do not have permission to create files.")
        return
    }
    createModalType.value = type
    isCreateModalOpen.value = true
}

const handleCreateNode = (data) => {
    editorStore.createFile(data.parentId || editorStore.fileTree.id, data.name, data.type)
    // TODO: Handle visibility/permissions in store
}

const openNodeSettings = (node) => {
    if (!groupStore.isLiveRoom) {
        alert("This is a read-only history view.")
        return
    }
    activeNodeForSettings.value = node
    isSettingsModalOpen.value = true
}

const handleUpdateNode = (updatedNode) => {
    // Rename
    if (updatedNode.name !== activeNodeForSettings.value.name) {
        editorStore.renameNode(updatedNode.id, updatedNode.name)
    }
    // TODO: Update permissions in store once supported
    
    // Close modal if rename successful (or keep open if just saving?)
    // Let's keep open for now or provide feedback. 
    // Actually, normally "Save" closes or stays. Let's assume reactive update.
}

const handleDeleteNode = (nodeId) => {
    editorStore.deleteFile(nodeId)
}

const handleEditorChange = (value) => {
    if (editorStore.activeFileId) {
        editorStore.updateFileContent(editorStore.activeFileId, value)
    }
}

const getLanguage = (filename) => {
    if (!filename) return 'text'
    if (filename.endsWith('.js')) return 'javascript'
    if (filename.endsWith('.vue')) return 'html' // Monaco doesn't support vue natively easily
    if (filename.endsWith('.html')) return 'html'
    if (filename.endsWith('.css')) return 'css'
    if (filename.endsWith('.json')) return 'json'
    if (filename.endsWith('.md')) return 'markdown'
    return 'text'
}
</script>

<template>
  <div class="h-full flex relative w-full overflow-hidden bg-[#0d0d0d]">
    <!-- Mobile Sidebar Backdrop -->
    <div 
        v-if="isSidebarOpen"
        @click="isSidebarOpen = false"
        class="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
    ></div>

    <!-- Sidebar (File Tree) -->
    <div 
        class="absolute md:relative z-40 h-full flex-none transition-all duration-300 border-r border-white/5 bg-[#0d0d0d] md:bg-deep-black/50 backdrop-blur-xl flex flex-col shadow-2xl md:shadow-none"
        :class="isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 md:w-0 opacity-0 md:opacity-0 -translate-x-full md:translate-x-0 overflow-hidden'"
    >
        <div class="p-3 border-b border-white/5 flex items-center justify-between">
            <span class="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Explorer</span>
            <div class="flex gap-1" :class="!isSidebarOpen && 'hidden'">
                <button v-if="groupStore.isLiveRoom" @click="openCreateModal('file')" class="p-1 hover:bg-white/5 rounded text-gray-400 hover:text-white" title="New File">
                    <FilePlus :size="16" />
                </button>
                <button v-if="groupStore.isLiveRoom" @click="openCreateModal('folder')" class="p-1 hover:bg-white/5 rounded text-gray-400 hover:text-white" title="New Folder">
                    <FolderPlus :size="16" />
                </button>
                <div class="w-px h-4 bg-white/10 mx-1"></div>
                <button @click="editorStore.downloadProject()" class="p-1 hover:bg-white/5 rounded text-gray-400 hover:text-white" title="Download Project">
                    <Download :size="16" />
                </button>
            </div>
        </div>

        <div class="flex-1 overflow-y-auto pt-2" :class="!isSidebarOpen && 'hidden'">
            <!-- File Tree -->
            <FileTree 
                :node="editorStore.fileTree" 
                :depth="0" 
                @context-menu="openNodeSettings"
                @select="handleFileSelect"
            />
        </div>
    </div>

    <!-- Main Editor Area -->
    <div class="flex-1 flex flex-col min-w-0 h-full">
        <!-- Top Bar / Tabs -->
        <div class="h-10 border-b border-white/5 flex items-center bg-[#151515]">
             <button @click="toggleSidebar" class="h-full px-3 border-r border-white/5 hover:bg-white/5 text-gray-400">
                <Menu :size="16" />
             </button>
             
             <!-- Tabs -->
             <div class="flex-1 flex overflow-x-auto no-scrollbar">
                <div 
                    v-for="fileId in editorStore.openFiles" 
                    :key="fileId"
                    @click="editorStore.openFile(fileId)"
                    class="group flex items-center h-full px-4 border-r border-white/5 text-sm cursor-pointer min-w-[120px] max-w-[200px]"
                    :class="editorStore.activeFileId === fileId ? 'bg-[#1e1e1e] text-neon-blue border-t-2 border-t-neon-blue' : 'text-gray-500 hover:bg-[#1e1e1e] hover:text-gray-300'"
                >
                    <FileCode :size="14" class="mr-2 opacity-70" />
                    <span class="truncate flex-1">{{ editorStore.findNodeById(editorStore.fileTree, fileId)?.name }}</span>
                    <button 
                        @click.stop="editorStore.closeFile(fileId)"
                        class="ml-2 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded p-0.5"
                    >
                        <X :size="12" />
                    </button>
                </div>
             </div>
        </div>

        <!-- Editor Content -->
        <div class="flex-1 relative bg-[#1e1e1e] cursor-text overflow-hidden">
            <div v-if="editorStore.activeFile" class="absolute inset-0">
                <MonacoEditor 
                    :value="editorStore.activeFile.content || ''"
                    :language="getLanguage(editorStore.activeFile.name)"
                    :read-only="!groupStore.isLiveRoom || (!groupStore.isHost && !editorStore.permissions.canEdit)"
                    @change="handleEditorChange"
                    theme="vs-dark"
                />
            </div>
            <div v-else class="absolute inset-0 flex items-center justify-center text-gray-500">
                <div class="text-center">
                    <Terminal :size="48" class="mx-auto mb-4 opacity-20" />
                    <p>Select a file to start coding</p>
                    <div class="mt-4 flex gap-4 justify-center">
                        <button v-if="groupStore.isLiveRoom" @click="openCreateModal('file')" class="text-xs px-3 py-1.5 bg-white/5 rounded hover:bg-white/10 flex items-center gap-2">
                            <FilePlus :size="12" /> New File
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Modals -->
    <CreateNodeModal 
        :isOpen="isCreateModalOpen" 
        :initialType="createModalType"
        :parentId="editorStore.fileTree.id"
        @close="isCreateModalOpen = false"
        @create="handleCreateNode"
    />

    <NodeSettingsModal
        v-if="activeNodeForSettings"
        :isOpen="isSettingsModalOpen"
        :node="activeNodeForSettings"
        @close="isSettingsModalOpen = false"
        @update="handleUpdateNode"
        @delete="handleDeleteNode"
    />
  </div>
</template>
