const { randomUUID: uuidv4 } = require('crypto');
const Project = require('../models/Project');
const RoomHistory = require('../models/RoomHistory');

// In-memory room state store
const rooms = new Map();

// Track which socket belongs to which user and room for quick cleanup
const socketToSession = new Map(); // socketId -> { userId, groupId }
const disconnectTimeouts = new Map(); // userId -> { timeout, groupId }

// Room PINs for quick join: pin -> roomId
const pinToRoomId = new Map();

// Debounced snapshot saves: roomId -> timeout
const snapshotTimeouts = new Map();

// Helper to get or create room
const getRoom = (groupId) => {
    if (!rooms.has(groupId)) {
        rooms.set(groupId, {
            hostUserId: null,
            originalHostId: null,  // DB host_id — never changes
            isLocked: false,
            permissions: {
                canEdit: true,
                canCreate: true,
                canDelete: false,
                canDownload: true
            },
            members: new Map() // userId -> { socketId, user }
        });
    }
    return rooms.get(groupId);
};

// Helper to check if user is host
const isHost = (groupId, userId) => {
    const room = getRoom(groupId);
    return room.hostUserId === userId;
};

// Debounced snapshot saver
const scheduleSaveSnapshot = (roomId, fileTree) => {
    if (snapshotTimeouts.has(roomId)) {
        clearTimeout(snapshotTimeouts.get(roomId).timeout);
    }
    const timeout = setTimeout(async () => {
        try {
            await RoomHistory.saveSnapshot(roomId, JSON.stringify(fileTree));
            console.log(`[SNAPSHOT] Saved snapshot for room ${roomId}`);
        } catch (err) {
            console.error('[SNAPSHOT] Error saving snapshot:', err.message);
        }
        snapshotTimeouts.delete(roomId);
    }, 10000); // Save after 10s of inactivity
    snapshotTimeouts.set(roomId, { timeout, fileTree });
};

// Rate limiter map: socketId -> { count, timestamp }
const rateLimits = new Map();

const checkRateLimit = (socketId) => {
    const now = Date.now();
    let record = rateLimits.get(socketId);
    
    if (!record || (now - record.timestamp > 1000)) {
        // Reset every second
        rateLimits.set(socketId, { count: 1, timestamp: now });
        return true;
    }
    
    if (record.count >= 20) {
        // Max 20 events per second
        return false;
    }
    
    record.count++;
    return true;
};

const sanitizeStr = (str, maxLen = 20000) => {
    if (!str) return str;
    return String(str).substring(0, maxLen);
};

// Recursively deep-clone a file tree, stripping nodes marked isPrivate:true or hidden for targetUserId
// This is used when syncing state to non-host users
const filterPrivateNodes = (node, targetUserId) => {
    if (!node) return node;

    // If this node itself is private, exclude it entirely
    if (node.isPrivate === true) return null;

    // If this node is hidden specifically for targetUserId
    if (targetUserId && Array.isArray(node.hiddenForUsers) && node.hiddenForUsers.map(String).includes(String(targetUserId))) {
        return null;
    }

    // Clone the node (shallow)
    const cloned = { ...node };

    // Recursively filter children
    if (Array.isArray(cloned.children)) {
        cloned.children = cloned.children
            .map(child => filterPrivateNodes(child, targetUserId))
            .filter(child => child !== null);
    }

    return cloned;
};

// Helper to get array of user objects currently in a room
const getMemberList = (room) => {
    if (!room || !room.members) return [];
    return Array.from(room.members.values()).map(m => m.user);
};

module.exports = (io, socket) => {
    console.log('[SOCKET] New socket connected:', socket.id);

    // Join Group
    socket.on('join_group', async ({ groupId: reqGroupId, user, isCreating }) => {
        let groupId = reqGroupId;
        
        // Handle 6-digit PIN mapping
        if (groupId && groupId.length === 6 && /^\d+$/.test(groupId)) {
            const mappedRoomId = pinToRoomId.get(groupId);
            if (mappedRoomId) {
                console.log(`[PIN_MAP] Mapped PIN ${groupId} to Room ${mappedRoomId}`);
                groupId = mappedRoomId;
                socket.emit('room_mapped', { mappedGroupId: groupId });
            } else {
                socket.emit('join_rejected', {
                    reason: 'Invalid PIN',
                    message: 'This PIN has expired or does not exist.'
                });
                return;
            }
        }

        console.log(`[JOIN_GROUP] Socket: ${socket.id}, Group: ${groupId}, User: ${user.username}, IsCreating: ${!!isCreating}`);

        // Look up DB project to get original host
        let dbProject = null;
        try {
            dbProject = await Project.findByRoomId(groupId);
        } catch (e) {
            console.error('[JOIN_GROUP] DB lookup error:', e.message);
        }

        const originalHostId = dbProject ? String(dbProject.host_id) : null;
        const userId = String(user.id);
        const isRoomLive = rooms.has(groupId);

        // Auto-elevate to creating if the user is the original host returning to an expired/dead room
        const effectiveIsCreating = isCreating || (originalHostId && userId === originalHostId);

        // === Case 1: Room is NOT live ===
        if (!isRoomLive) {
            if (!effectiveIsCreating) {
                // Non-creating join to a dead room — return history-only mode
                let history = { messages: [], fileTree: null };
                try {
                    history = await RoomHistory.getHistory(groupId);
                } catch (e) {
                    console.error('[JOIN_GROUP] History fetch error:', e.message);
                }

                socket.emit('room_info', {
                    hostUserId: originalHostId,
                    originalHostId,
                    isLocked: false,
                    permissions: { canEdit: false, canCreate: false, canDelete: false, canDownload: true },
                    isHost: false,
                    isLiveRoom: false,
                    myId: socket.id
                });
                socket.emit('room:history_data', history);
                return;
            } else {
                // effectiveIsCreating = true — only original host (or brand new room) can create
                if (dbProject && originalHostId && userId !== originalHostId) {
                    socket.emit('join_rejected', {
                        reason: 'Not Authorized',
                        message: 'Only the original host can re-host this room.'
                    });
                    return;
                }
            }
        }

        const room = getRoom(groupId);

        // Set originalHostId on room if not set yet
        if (!room.originalHostId && originalHostId) {
            room.originalHostId = originalHostId;
        }

        // Check if room is locked
        if (room.isLocked && !room.members.has(userId)) {
            socket.emit('join_rejected', {
                reason: 'Room is locked',
                message: 'This room is currently locked and not accepting new members.'
            });
            return;
        }

        // Handle Reconnection: Clear any pending disconnect timeout
        if (disconnectTimeouts.has(userId)) {
            const session = disconnectTimeouts.get(userId);
            clearTimeout(session.timeout);
            disconnectTimeouts.delete(userId);
            console.log(`[RECONNECT] User ${user.username} reconnected within grace period.`);
        }

        const isNewUser = !room.members.has(userId);

        // Update member info
        room.members.set(userId, { socketId: socket.id, user });
        socketToSession.set(socket.id, { userId, groupId });

        // Set host if this is the first user
        if (!room.hostUserId) {
            room.hostUserId = userId;
            console.log(`[HOST_SET] User ${user.username} is now host of room ${groupId}`);
        }

        // Join the room
        socket.join(groupId);

        // Only broadcast 'user_joined' if they aren't already in the room
        if (isNewUser) {
            socket.to(groupId).emit('user_joined', user);
        }

        // Determine if this is the original host
        const amIOriginalHost = originalHostId ? userId === originalHostId : room.hostUserId === userId;

        const activeMembers = getMemberList(room);

        // Send room info and current members list to the joining user
        socket.emit('room_info', {
            hostUserId: room.hostUserId,
            originalHostId: room.originalHostId,
            isLocked: room.isLocked,
            permissions: room.permissions,
            isHost: room.hostUserId === userId,
            isOriginalHost: amIOriginalHost,
            isLiveRoom: true,
            myId: socket.id,
            members: activeMembers
        });

        // Update everyone with new host info
        io.to(groupId).emit('host_changed', { newHostUserId: room.hostUserId });

        // Broadcast current authoritative members list to everyone in room
        io.to(groupId).emit('room_members', { members: activeMembers });

        // Send history to joining user (so they can see past messages)
        try {
            const history = await RoomHistory.getHistory(groupId);
            socket.emit('room:history_data', history);
        } catch (e) {
            console.error('[JOIN_GROUP] History fetch error on live join:', e.message);
        }
    });

    // Leave Group (Explicit)
    socket.on('leave_group', ({ groupId, user }) => {
        const room = rooms.get(groupId);
        if (room && user) {
            const userId = String(user.id);
            room.members.delete(userId);

            // If host left, transfer immediately
            if (room.hostUserId === userId && room.members.size > 0) {
                const nextUserId = room.members.keys().next().value;
                room.hostUserId = nextUserId;
                io.to(groupId).emit('host_changed', { newHostUserId: room.hostUserId });
            }

            if (room.members.size === 0) {
                rooms.delete(groupId);
            } else {
                io.to(groupId).emit('room_members', { members: getMemberList(room) });
            }

            socket.to(groupId).emit('user_left', user);
        }
        socket.leave(groupId);
    });

    // Chat Messages — broadcast and save
    socket.on('send_message', async (data) => {
        if (!checkRateLimit(socket.id)) return; // Rate Limit

        let { groupId, text, senderId, senderName, type, file, isSystem } = data;
        
        // Input sanitization (max 3000 chars for chat)
        text = sanitizeStr(text, 3000);
        
        const message = { id: uuidv4(), timestamp: new Date(), groupId, text, senderId, senderName, type, file, isSystem };
        io.to(groupId).emit('receive_message', message);

        // Persist to DB (skip ephemeral system messages like join/left)
        if (!isSystem) {
            try {
                await RoomHistory.saveMessage(groupId, {
                    senderId: senderId || null,
                    senderName: senderName || null,
                    type: type || 'text',
                    content: file ? file : (text || '')
                });
            } catch (err) {
                console.error('[HISTORY] Failed to save message:', err.message);
            }
        }
    });

    socket.on('request_room_pin', ({ groupId }) => {
        // We allow generating a PIN even if the room is still initializing in the memory Map.
        // The mapping is temporary (10m) and doesn't depend on the live room state.
        if (!groupId) return;

        let activePin = null;
        for (const [pin, rId] of pinToRoomId.entries()) {
            if (rId === groupId) {
                activePin = pin;
                break;
            }
        }

        if (!activePin) {
            do {
                activePin = Math.floor(100000 + Math.random() * 900000).toString();
            } while (pinToRoomId.has(activePin));

            pinToRoomId.set(activePin, groupId);
            console.log(`[PIN_GENERATED] Room ${groupId} mapped to PIN ${activePin}`);

            setTimeout(() => {
                if (pinToRoomId.get(activePin) === groupId) {
                    pinToRoomId.delete(activePin);
                    console.log(`[PIN_EXPIRED] PIN ${activePin} for Room ${groupId} expired`);
                }
            }, 10 * 60 * 1000); // 10 minutes
        }

        socket.emit('room_pin_issued', { pin: activePin });
    });

    socket.on('editor:join', (data) => {
        const { groupId } = data;
        socket.to(groupId).emit('editor:request_state', { requestorId: socket.id });
    });

    socket.on('editor:sync_state', (data) => {
        const { targetId, state } = data;

        // Determine if target user is the host — private files are only visible to host
        const targetSession = socketToSession.get(targetId);
        let filteredState = state;
        if (targetSession) {
            const room = rooms.get(targetSession.groupId);
            const isTargetHost = room && room.hostUserId === targetSession.userId;
            if (!isTargetHost && state) {
                // Deep-filter private and user-hidden nodes from the file tree before sending
                filteredState = filterPrivateNodes(state, targetSession.userId);
            }
        }

        io.to(targetId).emit('editor:full_state', filteredState);

        // Schedule snapshot save whenever state is synced
        const session = socketToSession.get(socket.id);
        if (session) {
            scheduleSaveSnapshot(session.groupId, state); // save UNFILTERED state
        }
    });

    socket.on('editor:file_update', (data) => {
        if (!checkRateLimit(socket.id)) return;

        let { groupId, fileId, content } = data;
        content = sanitizeStr(content, 200000); // 200KB character limit per string slice max just in case

        // Enforce canEdit permission for guests
        const session = socketToSession.get(socket.id);
        if (session) {
            const room = rooms.get(groupId);
            if (room && room.hostUserId !== session.userId && !room.permissions.canEdit) {
                return;
            }
        }
        socket.to(groupId).emit('editor:file_update', { fileId, content });

        // Schedule debounced snapshot (we don't have full tree here, rely on sync_state)
    });

    socket.on('editor:structure_update', (data) => {
        const { groupId, type } = data;
        const session = socketToSession.get(socket.id);
        if (session && type === 'create') {
            const room = rooms.get(groupId);
            if (room && room.hostUserId !== session.userId && !room.permissions.canCreate) {
                socket.emit('editor:create_rejected', { reason: 'File creation is disabled by the host.' });
                return;
            }
        }
        shadowBroadcast(socket, groupId, 'editor:structure_update', data);
    });

    // Helper for broadcasting
    const shadowBroadcast = (s, g, e, d) => s.to(g).emit(e, d);

    // Relay node permission updates (isPrivate, hiddenForUsers, blockedUsers) to all room members
    socket.on('editor:node_permissions_update', (data) => {
        const { groupId, nodeId, isPrivate, hiddenForUsers, blockedUsers } = data;
        const session = socketToSession.get(socket.id);
        // Only host can update file permissions
        if (!session || !isHost(groupId, session.userId)) {
            console.warn(`[PERM] Non-host tried to update node permissions in room ${groupId}`);
            return;
        }
        // Broadcast the permission changes to all members in the room
        io.to(groupId).emit('editor:node_permissions_update', { nodeId, isPrivate, hiddenForUsers, blockedUsers });
        console.log(`[PERM] Node ${nodeId} permissions updated in room ${groupId}: isPrivate=${isPrivate}, hiddenForUsers=${JSON.stringify(hiddenForUsers)}, blockedUsers=${JSON.stringify(blockedUsers)}`);
    });

    // Admin Events

    // Kick a user from the room
    socket.on('admin:kick_user', ({ groupId, targetUserId }) => {
        const session = socketToSession.get(socket.id);
        if (!session || !isHost(groupId, session.userId)) {
            console.warn(`[KICK] Non-host tried to kick user in room ${groupId}`);
            return;
        }

        const room = rooms.get(groupId);
        if (!room) return;

        const targetMember = room.members.get(String(targetUserId));
        if (!targetMember) {
            console.warn(`[KICK] Target user ${targetUserId} not found in room ${groupId}`);
            return;
        }

        const targetSocketId = targetMember.socketId;
        const targetUserObj = targetMember.user;

        // Remove from room state immediately
        room.members.delete(String(targetUserId));

        // Clear any pending disconnect timeout for this user
        if (disconnectTimeouts.has(String(targetUserId))) {
            clearTimeout(disconnectTimeouts.get(String(targetUserId)).timeout);
            disconnectTimeouts.delete(String(targetUserId));
        }

        // Notify the kicked user's socket
        io.to(targetSocketId).emit('kicked_from_room', {
            reason: 'You have been removed from the room by the host.'
        });

        // Notify the rest of the room
        socket.to(groupId).emit('user_left', targetUserObj);

        // Force the kicked socket to leave the room channel
        const targetSocket = io.sockets.sockets.get(targetSocketId);
        if (targetSocket) {
            targetSocket.leave(groupId);
            socketToSession.delete(targetSocketId);
        }

        // Clean up empty room or broadcast updated members
        if (room.members.size === 0) {
            rooms.delete(groupId);
            console.log(`[KICK] Room ${groupId} deleted (empty after kick).`);
        } else {
            io.to(groupId).emit('room_members', { members: getMemberList(room) });
        }

        console.log(`[KICK] User ${targetUserId} (socket: ${targetSocketId}) was kicked from room ${groupId}`);
    });

    socket.on('admin:lock_room', ({ groupId, isLocked }) => {
        const session = socketToSession.get(socket.id);
        if (session && isHost(groupId, session.userId)) {
            const room = getRoom(groupId);
            room.isLocked = isLocked;
            io.to(groupId).emit('room_lock_changed', { isLocked });
        }
    });

    socket.on('admin:update_permissions', ({ groupId, permissions }) => {
        const session = socketToSession.get(socket.id);
        if (session && isHost(groupId, session.userId)) {
            const room = getRoom(groupId);
            room.permissions = { ...room.permissions, ...permissions };
            io.to(groupId).emit('group:permission_update', room.permissions);
            console.log(`[PERMISSIONS] Room ${groupId} permissions updated:`, room.permissions);
        } else {
            console.warn(`[PERMISSIONS] Non-host tried to update permissions in room ${groupId}`);
        }
    });

    // Save full snapshot on demand (triggered by client periodically)
    socket.on('editor:save_snapshot', async ({ groupId, fileTree }) => {
        try {
            await RoomHistory.saveSnapshot(groupId, JSON.stringify(fileTree));
        } catch (err) {
            console.error('[SNAPSHOT] Manual save error:', err.message);
        }
    });

    socket.on('disconnect', () => {
        const session = socketToSession.get(socket.id);
        if (!session) return;

        const { userId, groupId } = session;
        socketToSession.delete(socket.id);

        console.log(`[DISCONNECT] User ${userId} disconnected. Starting 10s grace period.`);

        const timeout = setTimeout(() => {
            const room = rooms.get(groupId);
            if (!room) return;

            if (room.members.has(userId) && room.members.get(userId).socketId === socket.id) {
                const userObj = room.members.get(userId).user;
                room.members.delete(userId);
                console.log(`[CLEANUP] Grace period expired for User ${userId}. Removing from room.`);

                if (room.hostUserId === userId && room.members.size > 0) {
                    const nextUserId = room.members.keys().next().value;
                    room.hostUserId = nextUserId;
                    io.to(groupId).emit('host_changed', { newHostUserId: room.hostUserId });
                    console.log(`Host transferred to ${nextUserId}`);
                }

                socket.to(groupId).emit('user_left', userObj);

                if (room.members.size === 0) {
                    rooms.delete(groupId);
                    console.log(`Room ${groupId} deleted (empty).`);
                } else {
                    io.to(groupId).emit('room_members', { members: getMemberList(room) });
                }
            }
            disconnectTimeouts.delete(userId);
        }, 10000);

        disconnectTimeouts.set(userId, { timeout, groupId });
    });
};

module.exports.flushAllSnapshots = async () => {
    console.log(`[SHUTDOWN] Flushing ${snapshotTimeouts.size} pending snapshots...`);
    const promises = [];
    for (const [roomId, session] of snapshotTimeouts.entries()) {
        clearTimeout(session.timeout);
        promises.push(
            RoomHistory.saveSnapshot(roomId, JSON.stringify(session.fileTree))
                .then(() => console.log(`[SHUTDOWN] Saved snapshot for room ${roomId}`))
                .catch(err => console.error(`[SHUTDOWN] Failed to save snapshot for room ${roomId}:`, err.message))
        );
    }
    await Promise.all(promises);
    snapshotTimeouts.clear();
};
