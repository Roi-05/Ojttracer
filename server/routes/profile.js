const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { uploadSignature } = require('../middleware/upload');
const { authMiddleware } = require('../auth');

router.get('/coordinator', authMiddleware, profileController.getCoordinator);
router.put('/', authMiddleware, profileController.updateProfile);
router.post('/avatar', authMiddleware, profileController.uploadAvatar.single('avatar'), profileController.uploadAvatarHandler);
router.post('/signature', authMiddleware, uploadSignature.single('signature'), profileController.uploadSignatureHandler);

module.exports = router;

