const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit for now

router.post('/', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    // in a real stream scenario, we might handle things differently
    // or use this for specific small file holding
    res.json({ success: true, file: req.file });
});

module.exports = router;
