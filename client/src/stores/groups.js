import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { io } from "socket.io-client";
import { useUserStore } from "./user";
import { useAuthStore } from "./auth";
import { useProjectStore } from "./projects";
import { getSocketUrl } from "../utils/api";

export const useGroupStore = defineStore("group", () => {
  const userStore = useUserStore();
  const authStore = useAuthStore();
  const projectStore = useProjectStore();

  /* =======================
       STATE
    ======================= */
  const socket = ref(null);
  const isConnected = ref(false);
  const currentGroupId = ref(null);
  const members = ref([]);
  const messages = ref([]);
  const shouldShowConnectModal = ref(false);
  const hostId = ref(null);
  const isRoomLocked = ref(false);
  const joinError = ref(null);
  const isCreatingRoom = ref(false);
  const isLiveRoom = ref(false); // true = room has active host, false = history-only
  const originalHostId = ref(null); // DB host_id of the room's original creator
  const historyMessages = ref([]); // stored chat messages from DB
  const historyFileTree = ref(null); // stored file snapshot from DB
  const hasSavedInitialProject = ref(false); // flags if project was saved lazily
  const isTemporaryRoom = ref(false); // if true, never save to dashboard
  const pendingProjectName = ref(""); // project name chosen in HostRoomModal
  const liveRoomName = ref(""); // display name for the active room

  /* =======================
       SOCKET CONNECT
    ======================= */
  const connect = () => {
    if (socket.value) return;

    const SOCKET_URL = getSocketUrl();

    if (!SOCKET_URL) {
      console.error("SOCKET_URL is undefined");
      return;
    }

    console.log("Connecting to socket:", SOCKET_URL);

    socket.value = io(SOCKET_URL, {
      transports: ["polling", "websocket"],
      secure: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    /* ---------- Core Events ---------- */
    socket.value.on("connect", () => {
      isConnected.value = true;
      console.log("Socket connected:", socket.value.id);

      if (currentGroupId.value) {
        emitJoin(currentGroupId.value);
      }
    });

    socket.value.on("disconnect", (reason) => {
      isConnected.value = false;
      console.warn("Socket disconnected:", reason);
    });

    socket.value.on("connect_error", (err) => {
      console.error("Socket connect error:", err.message);
    });

    /* ---------- Group Events ---------- */
    socket.value.on("user_joined", (user) => {
      // Prevent duplicate system messages if user already exists
      if (!members.value.find((m) => m.id === user.id)) {
        members.value.push(user);
        addSystemMessage(`${user.username} joined the group`);
        ensureProjectSaved(); // meaningful action: another user joined
      }
    });

    socket.value.on("user_left", (user) => {
      members.value = members.value.filter((m) => m.id !== user.id);
      addSystemMessage(`${user.username} left the group`);
    });

    /* ---------- Chat Events ---------- */
    // Moved below to correctly handle isSelf logic

    /* ---------- Room Management Events ---------- */
    socket.value.on(
      "room_info",
      async ({
        hostUserId,
        isLocked,
        permissions,
        isHost: amIHost,
        isLiveRoom: liveFlag,
        originalHostId: oHostId,
        members: roomMembers,
      }) => {
        hostId.value = hostUserId;
        isRoomLocked.value = isLocked;
        isLiveRoom.value = liveFlag === true; // only true when server explicitly says true
        if (oHostId !== undefined) originalHostId.value = String(oHostId);
        if (roomMembers && Array.isArray(roomMembers)) {
          members.value = roomMembers;
        }
        console.log(
          `Room info received - Host User ID: ${hostUserId}, Am I Host: ${amIHost}, Live: ${liveFlag}, Members count: ${members.value.length}`,
        );
      },
    );

    socket.value.on("room_members", ({ members: roomMembers }) => {
      if (roomMembers && Array.isArray(roomMembers)) {
        members.value = roomMembers;
        console.log(
          `[ROOM_MEMBERS] Authoritative members update received: ${roomMembers.length} active participants`,
        );
      }
    });

    socket.value.on("room_mapped", ({ mappedGroupId }) => {
      currentGroupId.value = mappedGroupId;
      sessionStorage.setItem("antigravity_group_id", mappedGroupId);
      window.history.replaceState({}, "", `/join/${mappedGroupId}`);
    });

    socket.value.on("join_rejected", ({ reason, message }) => {
      joinError.value = message || reason || "Could not join room";
      // Reset room state so user goes back to landing
      currentGroupId.value = null;
      sessionStorage.removeItem("antigravity_group_id");
    });

    socket.value.on("kicked_from_room", ({ reason }) => {
      // Auto-leave the room cleanly
      currentGroupId.value = null;
      members.value = [];
      messages.value = [];
      hostId.value = null;
      isRoomLocked.value = false;
      isLiveRoom.value = false;
      originalHostId.value = null;
      historyMessages.value = [];
      historyFileTree.value = null;
      hasSavedInitialProject.value = false;
      sessionStorage.removeItem("antigravity_group_id");
      sessionStorage.removeItem("antigravity_room_name");
      liveRoomName.value = "";

      // Show notification to kicked user
      joinError.value =
        reason || "You have been removed from the room by the host.";
      console.warn("[KICKED]", reason);
    });

    socket.value.on("room_lock_changed", ({ isLocked }) => {
      isRoomLocked.value = isLocked;
      addSystemMessage(`Room ${isLocked ? "locked" : "unlocked"} by host`);
    });

    socket.value.on("host_changed", ({ newHostUserId }) => {
      if (hostId.value !== newHostUserId) {
        hostId.value = newHostUserId;
        const isNewHost = newHostUserId === userStore.userId;
        addSystemMessage(
          isNewHost ? "You are now the host" : "Host has changed",
        );
      }
    });

    /* ---------- Chat Events ---------- */
    socket.value.on("receive_message", (message) => {
      messages.value.push({
        ...message,
        isSelf: message.senderId === userStore.userId,
      });
    });

    /* ---------- History Events ---------- */
    socket.value.on("room:history_data", ({ messages: histMsgs, fileTree }) => {
      historyMessages.value = histMsgs || [];
      historyFileTree.value = fileTree || null;
      // Pre-populate chat messages for BOTH history-only and live re-hosted rooms
      if (histMsgs && histMsgs.length > 0) {
        messages.value = histMsgs.map((m) => ({
          id: m.id,
          text: typeof m.content === "string" ? m.content : "",
          file: typeof m.content === "object" ? m.content : null,
          senderId: m.senderId,
          senderName: m.senderName,
          type: m.type,
          timestamp: m.timestamp,
          isSelf: String(m.senderId) === userStore.userId,
          isHistorical: true,
        }));
      }
    });
  };

  /* =======================
       HELPERS
    ======================= */
  const emitJoin = (groupId) => {
    if (!socket.value || !isConnected.value) return;

    // Capture the flag BEFORE resetting so reconnection race conditions don't flip it
    const creating = isCreatingRoom.value;

    const user = {
      id: userStore.userId,
      username: userStore.username,
      avatar: userStore.avatar,
    };

    // On reconnect after transport close, isCreatingRoom is already false.
    // But if the user WAS the host (hostId matches), we need to pass isCreating=true
    // so the server doesn't put them in read-only mode.
    const wasHost =
      hostId.value && String(hostId.value) === String(userStore.userId);
    const effectiveCreating = creating || wasHost;

    socket.value.emit("join_group", {
      groupId,
      user,
      isCreating: effectiveCreating,
    });

    // Reset after emitting so subsequent auto-reconnects don't re-use the flag
    isCreatingRoom.value = false;
  };

  const addSystemMessage = (text) => {
    messages.value.push({
      id: Date.now(),
      type: "system",
      text,
      timestamp: new Date().toISOString(),
    });
  };

  const ensureProjectSaved = async () => {
    // Skip if: temporary room, already saved, not host, not live, not authenticated
    if (isTemporaryRoom.value) return;
    if (
      !hasSavedInitialProject.value &&
      isLiveRoom.value &&
      hostId.value === userStore.userId &&
      currentGroupId.value &&
      authStore.isAuthenticated &&
      authStore.user
    ) {
      try {
        hasSavedInitialProject.value = true; // Set early to prevent parallel overlapping calls
        const name =
          pendingProjectName.value.trim() || `Project ${currentGroupId.value}`;
        await projectStore.saveProject({
          name,
          roomId: currentGroupId.value,
          participants: [authStore.user.username],
          fileCount: 0,
          isHost: true,
        });
        pendingProjectName.value = ""; // clear after saving
        console.log("[groups] Lazy project saved successfully:", name);
      } catch (err) {
        hasSavedInitialProject.value = false; // reset back so next trigger can try again
        console.warn("[groups] Failed to save lazy project:", err);
      }
    }
  };

  /* =======================
       ACTIONS
    ======================= */
  const createGroup = ({ projectName = "", isTemporary = false } = {}) => {
    const groupId = Math.random().toString(36).substring(2, 8);
    isCreatingRoom.value = true;
    isTemporaryRoom.value = isTemporary;
    pendingProjectName.value = projectName;
    liveRoomName.value = projectName;
    // Persist name so it survives navigation/refresh
    if (projectName) {
      sessionStorage.setItem("antigravity_room_name", projectName);
    }
    joinGroup(groupId);
    return groupId;
  };

  const joinGroup = (groupId) => {
    if (!socket.value) connect();

    currentGroupId.value = groupId;
    sessionStorage.setItem("antigravity_group_id", groupId);

    const user = {
      id: userStore.userId,
      username: userStore.username,
      avatar: userStore.avatar,
    };

    if (!members.value.find((m) => m.id === user.id)) {
      members.value.push(user);
    }

    if (isConnected.value) {
      emitJoin(groupId);
    }

    // Update this device's last known group (for quick-reconnect from Devices panel)
    import("./devices")
      .then(({ useDeviceStore }) => {
        try {
          useDeviceStore().updateLastGroup(groupId);
        } catch {}
      })
      .catch(() => {});

    addSystemMessage(`You joined group ${groupId}`);
  };

  const sendMessage = (text, type = "text", fileData = null) => {
    if (!currentGroupId.value) return;

    // Validate: Don't send if both text and file are empty
    if (!text?.trim() && !fileData) {
      console.warn("Cannot send empty message");
      return;
    }

    if (socket.value && isConnected.value) {
      socket.value.emit("send_message", {
        groupId: currentGroupId.value,
        text: text || "",
        senderId: userStore.userId,
        senderName: userStore.username,
        avatar: userStore.avatar,
        isSystem: false,
        file: fileData,
      });

      ensureProjectSaved(); // meaningful action: user sent a message
    }

    // Don't add to local messages - let server broadcast handle it
    // This prevents duplicate messages
  };

  const leaveGroup = () => {
    if (socket.value && isConnected.value && currentGroupId.value) {
      socket.value.emit("leave_group", {
        groupId: currentGroupId.value,
        user: {
          id: userStore.userId,
          username: userStore.username,
          avatar: userStore.avatar,
        },
      });
    }

    sessionStorage.removeItem("antigravity_group_id");
    currentGroupId.value = null;
    members.value = [];
    messages.value = [];
    hostId.value = null;
    isRoomLocked.value = false;
    isLiveRoom.value = false;
    originalHostId.value = null;
    historyMessages.value = [];
    historyFileTree.value = null;
    hasSavedInitialProject.value = false;
    isTemporaryRoom.value = false;
    pendingProjectName.value = "";
    liveRoomName.value = "";
    sessionStorage.removeItem("antigravity_room_name");
  };

  /* =======================
       FILE UPLOAD (MOCK)
    ======================= */
  const uploadFile = async (file) => {
    await new Promise((r) => setTimeout(r, 800));

    const fileData = {
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
    };

    sendMessage("", "file", fileData);
    return true;
  };

  /* =======================
       PERSIST SESSION
    ======================= */
  const savedGroupId = sessionStorage.getItem("antigravity_group_id");
  const savedRoomName = sessionStorage.getItem("antigravity_room_name");
  if (savedGroupId) {
    currentGroupId.value = savedGroupId;
    if (savedRoomName) liveRoomName.value = savedRoomName;
    connect();
  }

  return {
    socket,
    isConnected,
    currentGroupId,
    members,
    messages,
    hostId,
    isHost: computed(() => hostId.value === userStore.userId),
    isRoomLocked,
    joinError,
    isLiveRoom,
    isCreatingRoom,
    isTemporaryRoom,
    pendingProjectName,
    liveRoomName,
    roomName: computed(
      () => liveRoomName.value || `Room #${currentGroupId.value || ""}`,
    ),
    originalHostId,
    historyMessages,
    historyFileTree,
    canHostRoom: computed(
      () =>
        !originalHostId.value ||
        String(originalHostId.value) === String(userStore.userId),
    ),
    connect,
    createGroup,
    joinGroup,
    leaveGroup,
    sendMessage,
    uploadFile,
    shouldShowConnectModal,
    addSystemMessage,
    ensureProjectSaved,
  };
});
