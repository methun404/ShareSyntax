const { getPool } = require('../config/db');
const { encrypt, decrypt } = require('../utils/crypto');

const RoomHistory = {
    // Save a chat/system message (encrypted)
    async saveMessage(roomId, { senderId, senderName, type, content }) {
        const pool = getPool();
        const encryptedContent = encrypt(
            typeof content === 'object' ? JSON.stringify(content) : (content || '')
        );
        await pool.execute(
            'INSERT INTO room_messages (room_id, sender_id, sender_name, type, content) VALUES (?, ?, ?, ?, ?)',
            [roomId, senderId || null, senderName || null, type || 'text', encryptedContent]
        );
    },

    // Save or update the file-tree snapshot for a room (encrypted)
    async saveSnapshot(roomId, fileTreeJSON) {
        const pool = getPool();
        const encryptedTree = encrypt(fileTreeJSON);
        await pool.execute(
            `INSERT INTO room_snapshots (room_id, file_tree) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE file_tree = VALUES(file_tree), updated_at = CURRENT_TIMESTAMP`,
            [roomId, encryptedTree]
        );
    },

    // Fetch and decrypt history for a room
    async getHistory(roomId) {
        const pool = getPool();

        const [msgRows] = await pool.execute(
            'SELECT id, sender_id, sender_name, type, content, timestamp FROM room_messages WHERE room_id = ? ORDER BY timestamp ASC',
            [roomId]
        );

        const messages = msgRows.map(row => {
            const decrypted = decrypt(row.content);
            let parsedContent;
            try { parsedContent = JSON.parse(decrypted); } catch { parsedContent = decrypted; }
            return {
                id: row.id,
                senderId: row.sender_id,
                senderName: row.sender_name,
                type: row.type,
                content: parsedContent,
                timestamp: row.timestamp
            };
        });

        const [snapRows] = await pool.execute(
            'SELECT file_tree, updated_at FROM room_snapshots WHERE room_id = ?',
            [roomId]
        );

        let fileTree = null;
        if (snapRows[0]) {
            const decryptedTree = decrypt(snapRows[0].file_tree);
            try { fileTree = JSON.parse(decryptedTree); } catch { fileTree = null; }
        }

        return { messages, fileTree };
    }
};

module.exports = RoomHistory;
