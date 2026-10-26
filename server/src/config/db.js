const mysql = require('mysql2/promise');

let pool;

const connectDB = async () => {
    const host = process.env.DB_HOST || 'localhost';
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD || '';
    const database = process.env.DB_NAME || 'sharesyntax';

    try {
        // Step 1: Connect without database to ensure it exists
        const tempConn = await mysql.createConnection({ host, user, password });
        await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
        await tempConn.end();

        // Step 2: Create the actual pool
        pool = mysql.createPool({
            host,
            user,
            password,
            database,
            waitForConnections: true,
            connectionLimit: 50,
            queueLimit: 0
        });

        console.log('MySQL Connected:', host);

        // Auto-create tables
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) NOT NULL UNIQUE,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                avatar LONGTEXT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Migration: Ensure avatar column is LONGTEXT for SVG/data URIs
        try {
            await pool.execute('ALTER TABLE users MODIFY COLUMN avatar LONGTEXT');
        } catch (e) {
            // Ignore if already LONGTEXT
        }

        await pool.execute(`
            CREATE TABLE IF NOT EXISTS projects (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                room_id VARCHAR(255) NOT NULL UNIQUE,
                host_id INT NULL,
                file_count INT DEFAULT 0,
                last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        await pool.execute(`
            CREATE TABLE IF NOT EXISTS project_guests (
                project_id INT NOT NULL,
                user_id INT NOT NULL,
                PRIMARY KEY (project_id, user_id),
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        await pool.execute(`
            CREATE TABLE IF NOT EXISTS room_messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                room_id VARCHAR(255) NOT NULL,
                sender_id VARCHAR(255) DEFAULT NULL,
                sender_name VARCHAR(100) DEFAULT NULL,
                type ENUM('text','file','system') DEFAULT 'text',
                content TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_room_messages (room_id)
            )
        `);

        await pool.execute(`
            CREATE TABLE IF NOT EXISTS room_snapshots (
                room_id VARCHAR(255) PRIMARY KEY,
                file_tree LONGTEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        await pool.execute(`
            CREATE TABLE IF NOT EXISTS saved_devices (
                device_id VARCHAR(255) NOT NULL,
                user_id INT NOT NULL,
                device_name VARCHAR(100) DEFAULT 'My Device',
                platform VARCHAR(50) DEFAULT 'web',
                last_group_id VARCHAR(255) DEFAULT NULL,
                last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (device_id, user_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_user_devices (user_id)
            )
        `);

        console.log('[DATABASE] MySQL Connected successfully.');
        console.log('[DATABASE] Ready on host:', host);
    } catch (error) {
        console.error('\n[DATABASE ERROR] MySQL connection failed!');
        console.error('Message:', error.message);
        console.error('Host:', host);
        console.error('User:', user);
        console.error('Ensure your .env credentials are correct and the database exists.\n');
        process.exit(1);
    }
};

const getPool = () => pool;

module.exports = { connectDB, getPool };
