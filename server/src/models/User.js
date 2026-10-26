const bcrypt = require('bcryptjs');
const { getPool } = require('../config/db');

const User = {
    async findById(id) {
        const pool = getPool();
        const [rows] = await pool.execute(
            'SELECT id, username, email, avatar, created_at FROM users WHERE id = ?',
            [id]
        );
        return rows[0] || null;
    },

    async findByEmail(email, includePassword = false) {
        const pool = getPool();
        const fields = includePassword
            ? 'id, username, email, password, avatar, created_at'
            : 'id, username, email, avatar, created_at';
        const [rows] = await pool.execute(
            `SELECT ${fields} FROM users WHERE email = ?`,
            [email]
        );
        return rows[0] || null;
    },

    async create({ username, email, password }) {
        const pool = getPool();
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const [result] = await pool.execute(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );

        return {
            id: result.insertId,
            username,
            email,
            avatar: 'default.png'
        };
    },

    async updateProfile(id, { username, avatar }) {
        const pool = getPool();
        await pool.execute(
            'UPDATE users SET username = ?, avatar = ? WHERE id = ?',
            [username, avatar || null, id]
        );
        return this.findById(id);
    },

    async matchPassword(enteredPassword, hashedPassword) {
        return await bcrypt.compare(enteredPassword, hashedPassword);
    }
};

module.exports = User;
