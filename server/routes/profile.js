const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { authMiddleware } = require('../auth');

router.put('/', authMiddleware, profileController.updateProfile);

module.exports = router;
