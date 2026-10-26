const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const RoomHistory = require('../models/RoomHistory');
const { protect } = require('../middleware/auth');

// @desc    Get user projects (Hosted + Joined)
// @route   GET /api/projects
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const projects = await Project.findByUser(req.user.id);
        res.json(projects);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Create or Update a project (Host or Join)
// @route   POST /api/projects
// @access  Private
router.post('/', protect, async (req, res) => {
    const { name, roomId, participants, fileCount, isHost } = req.body;

    try {
        // Check if project exists for this room
        let project = await Project.findByRoomId(roomId);

        if (project) {
            // Project exists
            if (project.host_id === req.user.id) {
                // I am the host, update details
                project = await Project.update(project.id, {
                    name: name || project.name,
                    fileCount: fileCount !== undefined ? fileCount : project.fileCount
                }, req.user.id);
            } else {
                // I am a guest
                if (!project.guests.includes(req.user.id)) {
                    await Project.addGuest(project.id, req.user.id);
                } else {
                    await Project.touch(project.id);
                }
                project = await Project.findById(project.id, req.user.id);
            }
        } else {
            // Create new project. If isHost is true, user is the host.
            // If false, it means the original host was unauthenticated and didn't save it, 
            // so we save the room with no host and add this user as a guest.
            project = await Project.create({
                name,
                roomId,
                hostId: isHost ? req.user.id : null,
                fileCount
            });
            
            // If they are a guest saving an orphaned room, add them to guest list
            if (!isHost) {
                await Project.addGuest(project.id, req.user.id);
                project = await Project.findById(project.id, req.user.id);
            }
        }

        res.json(project);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Rename a project
// @route   PATCH /api/projects/:id
// @access  Private
router.patch('/:id', protect, async (req, res) => {
    const { name } = req.body;
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        if (project.host_id !== req.user.id) {
            return res.status(403).json({ message: 'Only hosts can rename projects' });
        }

        const updated = await Project.update(project.id, { name }, req.user.id);
        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Delete or Leave a project
// @route   DELETE /api/projects/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const project = await Project.findById(req.params.id, req.user.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        if (project.host_id === req.user.id) {
            // I am the host, delete entirely
            await Project.deleteById(project.id);
            res.json({ message: 'Project deleted' });
        } else {
            // I am a guest, remove from history
            await Project.removeGuest(project.id, req.user.id);
            res.json({ message: 'Project removed from history' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Get room history (messages + snapshot)
// @route   GET /api/projects/:roomId/history
// @access  Private
router.get('/:roomId/history', protect, async (req, res) => {
    try {
        const { roomId } = req.params;
        // Verify user has access to this room
        const projects = await Project.findByUser(req.user.id);
        const hasAccess = projects.some(p => p.roomId === roomId);
        if (!hasAccess) {
            return res.status(403).json({ message: 'Access denied' });
        }
        const history = await RoomHistory.getHistory(roomId);
        res.json(history);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// @desc    Rehost a project (keeps history, generates new room ID)
// @route   POST /api/projects/:roomId/rehost
// @access  Private
router.post('/:roomId/rehost', protect, async (req, res) => {
    try {
        const { roomId } = req.params;
        const project = await Project.findByRoomId(roomId);
        
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        if (project.host_id !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized: only the host can re-host this room' });
        }

        // Generate a new 6-character room ID
        const newRoomId = Math.random().toString(36).substring(2, 8);
        
        await Project.rehostRoom(roomId, newRoomId);
        
        res.json({ newRoomId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
