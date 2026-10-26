const { getPool } = require('../config/db');

const Project = {
    // Get all projects where user is host or guest
    async findByUser(userId) {
        const pool = getPool();
        const [rows] = await pool.execute(`
            SELECT 
                p.id, p.name, p.room_id AS roomId, p.host_id, p.file_count AS fileCount, p.last_accessed AS lastAccessed,
                COALESCE(u.username, 'Anonymous') AS host_username, COALESCE(u.avatar, 'default.png') AS host_avatar,
                CASE WHEN p.host_id = ? THEN 'Host' ELSE 'Guest' END AS role
            FROM projects p
            LEFT JOIN users u ON u.id = p.host_id
            WHERE p.host_id = ?
               OR p.id IN (SELECT project_id FROM project_guests WHERE user_id = ?)
            ORDER BY p.last_accessed DESC
        `, [userId, userId, userId]);

        // Attach guest list
        for (const row of rows) {
            const [guests] = await pool.execute(
                'SELECT user_id FROM project_guests WHERE project_id = ?',
                [row.id]
            );
            row.guests = guests.map(g => g.user_id);
            row.host = { _id: row.host_id, id: row.host_id, username: row.host_username, avatar: row.host_avatar };
        }
        return rows;
    },

    // Find project by room ID
    async findByRoomId(roomId) {
        const pool = getPool();
        const [rows] = await pool.execute(
            'SELECT id FROM projects WHERE room_id = ?',
            [roomId]
        );
        if (!rows[0]) return null;
        return await Project.findById(rows[0].id);
    },

    // Find project by ID with full normalized data
    async findById(id, userId = null) {
        const pool = getPool();
        const [rows] = await pool.execute(`
            SELECT 
                p.id, p.name, p.room_id AS roomId, p.host_id, p.file_count AS fileCount, p.last_accessed AS lastAccessed,
                COALESCE(u.username, 'Anonymous') AS host_username, COALESCE(u.avatar, 'default.png') AS host_avatar,
                CASE WHEN p.host_id = ? THEN 'Host' ELSE 'Guest' END AS role
            FROM projects p
            LEFT JOIN users u ON u.id = p.host_id
            WHERE p.id = ?
        `, [userId, id]);

        if (!rows[0]) return null;
        
        const project = rows[0];
        const [guests] = await pool.execute(
            'SELECT user_id FROM project_guests WHERE project_id = ?',
            [project.id]
        );
        project.guests = guests.map(g => g.user_id);
        project.host = { _id: project.host_id, id: project.host_id, username: project.host_username, avatar: project.host_avatar };
        
        return project;
    },

    // Create a new project
    async create({ name, roomId, hostId, fileCount = 0 }) {
        const pool = getPool();
        const [result] = await pool.execute(
            'INSERT INTO projects (name, room_id, host_id, file_count) VALUES (?, ?, ?, ?)',
            [name, roomId, hostId, fileCount]
        );
        return await Project.findById(result.insertId, hostId);
    },

    // Update project details
    async update(id, { name, fileCount }, userId = null) {
        const pool = getPool();
        const fields = [];
        const values = [];

        if (name !== undefined) { fields.push('name = ?'); values.push(name); }
        if (fileCount !== undefined) { fields.push('file_count = ?'); values.push(fileCount); }
        fields.push('last_accessed = CURRENT_TIMESTAMP');
        values.push(id);

        await pool.execute(
            `UPDATE projects SET ${fields.join(', ')} WHERE id = ?`,
            values
        );
        return await Project.findById(id, userId);
    },

    // Touch last_accessed
    async touch(id) {
        const pool = getPool();
        await pool.execute(
            'UPDATE projects SET last_accessed = CURRENT_TIMESTAMP WHERE id = ?',
            [id]
        );
    },

    // Add a guest
    async addGuest(projectId, userId) {
        const pool = getPool();
        await pool.execute(
            'INSERT IGNORE INTO project_guests (project_id, user_id) VALUES (?, ?)',
            [projectId, userId]
        );
        await Project.touch(projectId);
    },

    // Remove a guest
    async removeGuest(projectId, userId) {
        const pool = getPool();
        await pool.execute(
            'DELETE FROM project_guests WHERE project_id = ? AND user_id = ?',
            [projectId, userId]
        );
    },

    // Delete a project entirely
    async deleteById(id) {
        const pool = getPool();
        await pool.execute('DELETE FROM projects WHERE id = ?', [id]);
    },

    // Rehost room by changing room ID
    async rehostRoom(oldRoomId, newRoomId) {
        const pool = getPool();
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            await connection.execute('UPDATE projects SET room_id = ? WHERE room_id = ?', [newRoomId, oldRoomId]);
            await connection.execute('UPDATE room_messages SET room_id = ? WHERE room_id = ?', [newRoomId, oldRoomId]);
            await connection.execute('UPDATE room_snapshots SET room_id = ? WHERE room_id = ?', [newRoomId, oldRoomId]);
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
};

module.exports = Project;
