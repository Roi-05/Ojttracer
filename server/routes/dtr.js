const express = require('express');
const router = express.Router();
const dtrController = require('../controllers/dtrController');
const { authMiddleware } = require('../auth');

router.post('/dtr/clock', authMiddleware, dtrController.clockDtr);
router.get('/dtr', authMiddleware, dtrController.getDtr);
router.get('/admin/dtr', authMiddleware, dtrController.getAdminDtr);
router.get('/company/dtr', authMiddleware, dtrController.getCompanyDtr);

module.exports = router;
