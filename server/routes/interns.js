const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { authMiddleware } = require('../auth');

router.get('/', authMiddleware, companyController.getInterns);
router.put('/:studentId/break-time', authMiddleware, companyController.updateInternBreakTime);

module.exports = router;
