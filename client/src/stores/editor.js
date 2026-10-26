import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import { useGroupStore } from "./groups";
import { useUserStore } from "./user";
import JSZip from "jszip";
import { saveAs } from "file-saver";

export const useEditorStore = defineStore("editor", () => {
  const groupStore = useGroupStore();
  const userStore = useUserStore();

  // State
  // Format: { id: 'root', name: 'root', type: 'folder', children: [] }
  const fileTree = ref({
    id: "root",
    name: "Project",
    type: "folder",
    children: [
      {
        id: "readme",
        name: "README.md",
        type: "file",
        content:
          "# Welcome to ShareSyntax Code Editor\n\nCollaborate in real-time!",
      },
    ],
  });

  const activeFileId = ref(null);
  const openFiles = ref([]);
  const isEditorMode = ref(false);

  // Permissions
  const permissions = ref({
    canEdit: true,
    canCreate: true,
    canDelete: false,
    canDownload: true,
  });

  // Getters
  const activeFile = computed(() => {
    if (!activeFileId.value) return null;
    return findNodeById(fileTree.value, activeFileId.value);
  });

  // Helpers
  const handleRequestState = ({ requestorId }) => {
    // Debug log
    console.log(
      "Received state request from:",
      requestorId,
      "Am I host?",
      groupStore.isHost,
    );

    // ONLY the host should provide the authoritative state to a joining user.
    // This prevents "state dogpiling" where multiple users try to sync the same state.
    if (groupStore.isHost) {
      console.log("Sending authoritative state to", requestorId);
      groupStore.socket.emit("editor:sync_state", {
        targetId: requestorId,
        state: fileTree.value,
      });
    }
  };

  const findNodeById = (node, id) => {
    if (node.id === id) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = findNodeById(child, id);
        if (found) return found;
      }
    }
    return null;
  };

  const findParentById = (root, nodeId) => {
    if (!root.children) return null;
    for (const child of root.children) {
      if (child.id === nodeId) return root;
      const found = findParentById(child, nodeId);
      if (found) return found;
    }
    return null;
  };

  // Actions
  const setEditorMode = (value) => (isEditorMode.value = value);

  const openFile = (fileId) => {
    const file = findNodeById(fileTree.value, fileId);
    if (file && !groupStore.isHost) {
      const currentUserId = String(userStore.userId);
      if (
        file.blockedUsers &&
        Array.isArray(file.blockedUsers) &&
        file.blockedUsers.map(String).includes(currentUserId)
      ) {
        alert(`Access to '${file.name}' is blocked by the host.`);
        return;
      }
      if (
        file.isPrivate ||
        (file.hiddenForUsers &&
          Array.isArray(file.hiddenForUsers) &&
          file.hiddenForUsers.map(String).includes(currentUserId))
      ) {
        return;
      }
    }
    if (!openFiles.value.includes(fileId)) openFiles.value.push(fileId);
    activeFileId.value = fileId;
  };

  const closeFile = (fileId) => {
    openFiles.value = openFiles.value.filter((id) => id !== fileId);
    if (activeFileId.value === fileId) {
      activeFileId.value =
        openFiles.value.length > 0
          ? openFiles.value[openFiles.value.length - 1]
          : null;
    }
  };

  // --- Socket Actions ---

  let updateTimeout = null;
  const updateFileContent = (fileId, newContent, emit = true) => {
    const file = findNodeById(fileTree.value, fileId);
    if (file) {
      if (emit && !groupStore.isHost) {
        const currentUserId = String(userStore.userId);
        // Host can always edit, guests need permission
        if (!permissions.value.canEdit) {
          console.warn("Cannot edit: permission denied");
          return;
        }
        if (
          file.blockedUsers &&
          Array.isArray(file.blockedUsers) &&
          file.blockedUsers.map(String).includes(currentUserId)
        ) {
          console.warn("Cannot edit: access blocked by host");
          return;
        }
      }

      file.content = newContent;

      if (emit && groupStore.socket) {
        // Debounce the socket emission to prevent flooding and blinking
        if (updateTimeout) clearTimeout(updateTimeout);
        updateTimeout = setTimeout(() => {
          groupStore.socket.emit("editor:file_update", {
            groupId: groupStore.currentGroupId,
            fileId,
            content: newContent,
          });
          groupStore.ensureProjectSaved();
        }, 400); // 400ms debounce
      }
    }
  };

  const createFile = (parentId, name, type = "file", emit = true) => {
    // Host can always create, guests need permission
    if (emit && !groupStore.isHost && !permissions.value.canCreate) {
      alert("You do not have permission to create files.");
      return;
    }

    const parent = findNodeById(fileTree.value, parentId);
    if (parent && parent.children) {
      const newNode = {
        id: emit ? Date.now().toString() : name.id, // Use provided ID if remote, else gen new
        name: emit ? name : name.name,
        type,
        content: type === "file" ? "" : undefined,
        createdBy: emit ? userStore.userId : name.createdBy || null,
        children: type === "folder" ? [] : undefined,
      };
      if (!emit) {
        // If remote, use full node object logic if needed using 'name' arg as node object
        // But simplistically:
        newNode.id = name.id || newNode.id;
        newNode.name = name.name || newNode.name;
        newNode.createdBy = name.createdBy || newNode.createdBy;
      }

      parent.children.push(newNode);

      if (type === "file" && emit) {
        openFile(newNode.id);
      }

      if (emit && groupStore.socket) {
        groupStore.socket.emit("editor:structure_update", {
          groupId: groupStore.currentGroupId,
          type: "create",
          node: newNode,
          parentId,
        });
        groupStore.ensureProjectSaved();
      }
    }
  };

  const deleteFile = (nodeId, emit = true) => {
    // Host can always delete, guests need permission
    // Also check creation ownership if not host
    const node = findNodeById(fileTree.value, nodeId);

    if (emit && !groupStore.isHost) {
      if (!permissions.value.canDelete) {
        // Check if user owns the file - strict requirement from user: "only tar nejr create kora file remove/rename korta parbe"
        const isOwner = node?.createdBy === userStore.userId;
        if (!isOwner) {
          alert("You can only delete files you created.");
          return;
        }
      } else {
        // Even if global delete is allowed, maybe we restrict to owner?
        // User said: "jodi guest file remove/rename korte cai taile only tar nejr create kora file remove/rename korta parbe"
        // This implies strict ownership for guests regardless of global flag, OR global flag enables "guest deletion" but constrained to own files.
        // Let's enforce ownership for guests always for safety as requested.
        const isOwner = node?.createdBy === userStore.userId;
        if (!isOwner) {
          alert("You can only delete files you created.");
          return;
        }
      }
    }

    const parent = findParentById(fileTree.value, nodeId);
    if (parent) {
      parent.children = parent.children.filter((c) => c.id !== nodeId);
      closeFile(nodeId);

      if (emit && groupStore.socket) {
        groupStore.socket.emit("editor:structure_update", {
          groupId: groupStore.currentGroupId,
          type: "delete",
          node: { id: nodeId }, // Only need ID
          parentId: parent.id,
        });
        groupStore.ensureProjectSaved();
      }
    }
  };

  const renameNode = (id, newName, emit = true) => {
    const node = findNodeById(fileTree.value, id);
    if (node) {
      if (emit && !groupStore.isHost) {
        // Guest check
        const isOwner = node.createdBy === userStore.userId;
        if (!isOwner) {
          alert("You can only rename files you created.");
          return;
        }
      }

      node.name = newName;
      const parent = findParentById(fileTree.value, id);
      if (parent) sortChildren(parent);

      if (emit && groupStore.socket) {
        groupStore.socket.emit("editor:structure_update", {
          groupId: groupStore.currentGroupId,
          type: "rename",
          node: { id, name: newName },
        });
        groupStore.ensureProjectSaved();
      }
    }
  };

  const downloadProject = async () => {
    if (!groupStore.isHost && !permissions.value.canDownload) {
      alert("Downloads are disabled by the host.");
      return;
    }

    const zip = new JSZip();

    // Helper to recursively add nodes
    const addNodeToZip = (node, folder) => {
      if (node.type === "file") {
        folder.file(node.name, node.content || "");
      } else if (node.type === "folder") {
        const subFolder = folder.folder(node.name);
        if (node.children) {
          node.children.forEach((child) => addNodeToZip(child, subFolder));
        }
      }
    };

    // Add all root children to zip
    if (fileTree.value.children) {
      fileTree.value.children.forEach((child) => addNodeToZip(child, zip));
    }

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "project.zip");
  };

  const downloadNode = async (nodeId) => {
    if (!groupStore.isHost && !permissions.value.canDownload) {
      alert("Downloads are disabled by the host.");
      return;
    }

    const node = findNodeById(fileTree.value, nodeId);
    if (!node) return;

    if (node.type === "file") {
      // Single file download
      const blob = new Blob([node.content || ""], {
        type: "text/plain;charset=utf-8",
      });
      saveAs(blob, node.name);
    } else if (node.type === "folder") {
      // Folder download as Zip
      const zip = new JSZip();
      const addNodeToZip = (n, folder) => {
        if (n.type === "file") {
          folder.file(n.name, n.content || "");
        } else if (n.type === "folder") {
          const subFolder = folder.folder(n.name);
          if (n.children) {
            n.children.forEach((child) => addNodeToZip(child, subFolder));
          }
        }
      };

      // Start recursion from this folder's children
      // We want the folder itself to be the root of the zip, OR content inside?
      // Usually "Download Folder" -> Zip named "Folder.zip" containing items.
      if (node.children) {
        node.children.forEach((child) => addNodeToZip(child, zip));
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${node.name}.zip`);
    }
  };

  // Initialize Listeners
  const initSocketListeners = () => {
    if (!groupStore.socket) return;

    // Join editor room/channel logical handshake
    const joinEditor = () => {
      groupStore.socket.emit("editor:join", {
        groupId: groupStore.currentGroupId,
      });
      console.log("Requesting editor state...");
    };

    joinEditor();

    // Also retry if state is empty after 1s (fallback)
    setTimeout(() => {
      if (
        fileTree.value.children.length <= 1 &&
        fileTree.value.children[0]?.id === "readme"
      ) {
        console.log("Retry requesting editor state...");
        joinEditor();
      }
    }, 1000);

    groupStore.socket.off("editor:request_state");
    groupStore.socket.on("editor:request_state", handleRequestState);

    groupStore.socket.off("editor:full_state");
    groupStore.socket.on("editor:full_state", (state) => {
      fileTree.value = state;
    });

    groupStore.socket.off("editor:file_update");
    groupStore.socket.on("editor:file_update", ({ fileId, content }) => {
      updateFileContent(fileId, content, false);
    });

    groupStore.socket.off("editor:structure_update");
    groupStore.socket.on(
      "editor:structure_update",
      ({ type, node, parentId }) => {
        if (type === "create") {
          const parent = findNodeById(fileTree.value, parentId);
          if (parent && parent.children) {
            parent.children.push(node);
            sortChildren(parent);
          }
        } else if (type === "delete") {
          const parent = findParentById(fileTree.value, node.id);
          if (parent && parent.children) {
            parent.children = parent.children.filter((c) => c.id !== node.id);
          }
        } else if (type === "rename") {
          renameNode(node.id, node.name, false);
        }
      },
    );

    groupStore.socket.off("editor:node_permissions_update");
    groupStore.socket.on(
      "editor:node_permissions_update",
      ({ nodeId, isPrivate, hiddenForUsers, blockedUsers }) => {
        const node = findNodeById(fileTree.value, nodeId);

        if (node) {
          node.isPrivate = isPrivate;
          node.hiddenForUsers = hiddenForUsers || [];
          node.blockedUsers = blockedUsers || [];

          // If current user is NOT host, enforce permissions immediately
          if (!groupStore.isHost) {
            const currentUserId = String(userStore.userId);
            const isHiddenFromMe =
              isPrivate ||
              (hiddenForUsers &&
                hiddenForUsers.map(String).includes(currentUserId));
            const isBlockedFromMe =
              blockedUsers && blockedUsers.map(String).includes(currentUserId);

            if (isHiddenFromMe || isBlockedFromMe) {
              if (openFiles.value.includes(nodeId)) {
                if (node.content !== undefined) {
                  node.content = ""; // Wipe content from memory
                }
                closeFile(nodeId);
              }
            }
          }
        }
      },
    );

    // Listen for permission updates (global)
    groupStore.socket.off("group:permission_update");
    groupStore.socket.on("group:permission_update", (perms) => {
      permissions.value = { ...permissions.value, ...perms };
    });

    // Listen for server-rejected create events (when host disables file creation)
    groupStore.socket.off("editor:create_rejected");
    groupStore.socket.on("editor:create_rejected", ({ reason }) => {
      alert(reason || "File creation is not allowed by the host.");
    });
  };

  // Watch history tree from groupStore so Re-Hosted/History rooms get pre-populated
  watch(
    () => groupStore.historyFileTree,
    (newTree) => {
      if (newTree && (!groupStore.isLiveRoom || groupStore.isHost)) {
        const parsed =
          typeof newTree === "string" ? JSON.parse(newTree) : newTree;
        if (parsed && parsed.id) {
          fileTree.value = parsed;
        }
      }
    },
    { immediate: true },
  );

  return {
    fileTree,
    permissions,
    activeFileId,
    activeFile,
    openFiles,
    isEditorMode,
    setEditorMode,
    openFile,
    closeFile,
    updateFileContent,
    createFile,
    deleteFile,
    renameNode,
    findNodeById,
    downloadProject,
    downloadNode,
    initSocketListeners,
  };
});
