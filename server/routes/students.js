const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { authMiddleware } = require('../auth');

router.get('/', authMiddleware, studentController.getStudents);
router.get('/active-companies', authMiddleware, studentController.getActiveCompanies);
router.put('/intended-company', authMiddleware, studentController.setIntendedCompany);
router.put('/:studentId/deploy', authMiddleware, studentController.deployStudent);

module.exports = router;
