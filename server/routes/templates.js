const express = require('express');
const router = express.Router();
const templateController = require('../controllers/templateController');
const { authMiddleware } = require('../auth');
const { uploadTemplate } = require('../middleware/upload');

router.get('/', templateController.getTemplates);
router.post('/', authMiddleware, uploadTemplate.single('file'), templateController.uploadTemplate);
router.delete('/:slug', authMiddleware, templateController.deleteTemplate);

module.exports = router;
