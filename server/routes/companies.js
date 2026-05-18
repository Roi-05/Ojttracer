const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { authMiddleware } = require('../auth');

router.get('/', authMiddleware, companyController.getCompanies);
router.put('/:id/verify', authMiddleware, companyController.verifyCompany);
router.put('/:id/moa', authMiddleware, companyController.updateMoa);
router.put('/:id/location', authMiddleware, companyController.updateCompanyLocation);
router.put('/location/me', authMiddleware, companyController.updateCompanyLocation);
router.post('/signed-moa', authMiddleware, companyController.uploadSignedMoa);
router.get('/moa-template', authMiddleware, companyController.getMoaTemplate);

module.exports = router;
