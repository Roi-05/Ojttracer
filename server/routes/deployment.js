const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { authMiddleware } = require('../auth');

router.get('/', authMiddleware, studentController.getDeployment);

module.exports = router;
