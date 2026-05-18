const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../auth');
const { uploadExcel } = require('../middleware/upload');
const { importStudents, previewImport } = require('../controllers/importController');

// POST /import/students/preview — parse & return rows without saving
router.post('/students/preview', authMiddleware, uploadExcel.single('file'), previewImport);

// POST /import/students — parse, create accounts, send emails
router.post('/students', authMiddleware, uploadExcel.single('file'), importStudents);

module.exports = router;
