const express = require('express');
const router = express.Router();
const { getPool } = require('../config/db');
const { protect: authMiddleware } = require('../middleware/auth');

// Register or update a device
router.post('/register', authMiddleware, async (req, res) => {
    const pool = getPool();
    const userId = req.user.id;
    const { deviceId, deviceName, platform } = req.body;

    if (!deviceId) return res.status(400).json({ message: 'deviceId is required' });

    try {
        // Upsert: insert if new, update last_seen if exists
        await pool.execute(
            `INSERT INTO saved_devices (device_id, user_id, device_name, platform, last_seen)
             VALUES (?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE 
                device_name = VALUES(device_name),
                platform = VALUES(platform),
                last_seen = NOW()`,
            [deviceId, userId, deviceName || 'Unknown Device', platform || 'web']
        );
        res.json({ success: true });
    } catch (err) {
        console.error('[DEVICES] Register error:', err.message);
        res.status(500).json({ message: 'Failed to register device' });
    }
});

// Get all saved devices for the current user
router.get('/', authMiddleware, async (req, res) => {
    const pool = getPool();
    const userId = req.user.id;

    try {
        const [rows] = await pool.execute(
            `SELECT device_id, device_name, platform, last_seen, last_group_id
             FROM saved_devices WHERE user_id = ? ORDER BY last_seen DESC`,
            [userId]
        );
        res.json(rows);
    } catch (err) {
        console.error('[DEVICES] Fetch error:', err.message);
        res.status(500).json({ message: 'Failed to fetch devices' });
    }
});

// Rename a device
router.put('/:deviceId', authMiddleware, async (req, res) => {
    const pool = getPool();
    const userId = req.user.id;
    const { deviceId } = req.params;
    const { deviceName } = req.body;

    if (!deviceName?.trim()) return res.status(400).json({ message: 'deviceName is required' });

    try {
        await pool.execute(
            `UPDATE saved_devices SET device_name = ? WHERE device_id = ? AND user_id = ?`,
            [deviceName.trim(), deviceId, userId]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Failed to rename device' });
    }
});

// Delete a device
router.delete('/:deviceId', authMiddleware, async (req, res) => {
    const pool = getPool();
    const userId = req.user.id;
    const { deviceId } = req.params;

    try {
        await pool.execute(
            `DELETE FROM saved_devices WHERE device_id = ? AND user_id = ?`,
            [deviceId, userId]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete device' });
    }
});

// Update the last active group for this device (called by socket logic)
router.post('/update-group', authMiddleware, async (req, res) => {
    const pool = getPool();
    const userId = req.user.id;
    const { deviceId, groupId } = req.body;

    try {
        await pool.execute(
            `UPDATE saved_devices SET last_group_id = ?, last_seen = NOW() WHERE device_id = ? AND user_id = ?`,
            [groupId, deviceId, userId]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Failed to update device group' });
    }
});

module.exports = router;
