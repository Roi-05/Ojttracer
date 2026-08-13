const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { authMiddleware } = require('../auth');
const { uploadDoc, uploadConvert } = require('../middleware/upload');

router.get('/', authMiddleware, documentController.getDocuments);
router.post('/submit', authMiddleware, uploadDoc.single('file'), documentController.submitDocument);
router.put('/review', authMiddleware, documentController.reviewDocument);
router.post('/convert-pdf', uploadConvert.single('file'), documentController.convertDocxToPdf);

module.exports = router;

