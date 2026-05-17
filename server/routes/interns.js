const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { authMiddleware } = require('../auth');

router.get('/', authMiddleware, companyController.getInterns);

module.exports = router;
