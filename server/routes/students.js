const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { authMiddleware } = require('../auth');

router.get('/', authMiddleware, studentController.getStudents);
router.get('/active-companies/:companyId', authMiddleware, studentController.getActiveCompany);
router.get('/active-companies', authMiddleware, studentController.getActiveCompanies);
router.get('/device-status', authMiddleware, studentController.getDeviceStatus);
router.post('/register-device', authMiddleware, studentController.registerDevice);
router.post('/:studentId/reset-device', authMiddleware, studentController.resetStudentDevice);
router.put('/intended-company', authMiddleware, studentController.setIntendedCompany);
router.put('/:studentId/deploy', authMiddleware, studentController.deployStudent);

module.exports = router;
