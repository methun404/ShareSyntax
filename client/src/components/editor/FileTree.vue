<script setup>
import { ref, computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useGroupStore } from '@/stores/groups'
import { useUserStore } from '@/stores/user'
import { Folder, FolderOpen, FileCode, ChevronRight, ChevronDown, File, MoreVertical } from 'lucide-vue-next'

const props = defineProps({
  node: {
    type: Object,
    required: true
  },
  depth: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['context-menu', 'select'])

const editorStore = useEditorStore()
const groupStore = useGroupStore()
const userStore = useUserStore()
const isOpen = ref(true)

// Filter visible children based on permissions
const visibleChildren = computed(() => {
    const children = props.node.children
    if (!children) return []

    // Host can see all files (including private ones)
    if (groupStore.isHost) return children

    const currentUserId = String(userStore.userId)

    // Guests cannot see files/folders marked as private or hidden specifically for them
    return children.filter(child => {
        if (child.isPrivate) return false
        if (child.hiddenForUsers && Array.isArray(child.hiddenForUsers)) {
            if (child.hiddenForUsers.map(String).includes(currentUserId)) return false
        }
        return true
    })
})

const toggle = () => {
    if (props.node.type === 'folder') {
        isOpen.value = !isOpen.value
    } else {
        // Check if current guest user is blocked for this file
        if (!groupStore.isHost && props.node.blockedUsers && Array.isArray(props.node.blockedUsers)) {
            const currentUserId = String(userStore.userId)
            if (props.node.blockedUsers.map(String).includes(currentUserId)) {
                alert(`Access to '${props.node.name}' is blocked by the host.`)
                return
            }
        }
        editorStore.openFile(props.node.id)
        emit('select', props.node)
    }
}

const handleContextMenu = (e) => {
    e.stopPropagation()
    emit('context-menu', props.node)
}

const getIcon = () => {
    if (props.node.type === 'folder') return isOpen.value ? FolderOpen : Folder
    return FileCode
}
</script>

<template>
  <div class="select-none">
    <!-- Node Item -->
    <div 
        @click="toggle"
        class="group flex items-center justify-between py-1 px-2 cursor-pointer transition-colors text-sm"
        :class="[
            editorStore.activeFileId === node.id ? 'bg-[#37373d] text-white' : 'text-gray-400 hover:bg-[#2a2d2e] hover:text-gray-200',
            depth === 0 ? 'font-bold' : ''
        ]"
        :style="{ paddingLeft: `${depth * 12 + 8}px` }"
    >
        <div class="flex items-center gap-1.5 overflow-hidden">
            <!-- Arrow -->
            <div class="shrink-0 w-4 flex justify-center">
                 <component 
                    v-if="node.type === 'folder'" 
                    :is="isOpen ? ChevronDown : ChevronRight" 
                    :size="14" 
                 />
            </div>

            <!-- Icon -->
            <component 
                :is="getIcon()" 
                :size="16" 
                :class="node.type === 'folder' ? 'text-neon-blue' : 'text-gray-500'" 
            />
            
            <!-- Name -->
            <span class="truncate">{{ node.name }}</span>
        </div>
        
        <!-- Context Menu Trigger -->
        <button 
            @click.stop="handleContextMenu"
            class="p-0.5 rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
        >
            <MoreVertical :size="14" />
        </button>
    </div>

    <!-- Children (Recursive) -->
    <div v-if="node.type === 'folder' && isOpen" class="overflow-hidden">
        <FileTree 
            v-for="child in visibleChildren" 
            :key="child.id" 
            :node="child" 
            :depth="depth + 1" 
            @context-menu="$emit('context-menu', $event)"
            @select="$emit('select', $event)"
        />
    </div>
  </div>
</template>
