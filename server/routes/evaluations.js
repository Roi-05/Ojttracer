const express = require('express');
const router = express.Router();
const evaluationController = require('../controllers/evaluationController');
const { authMiddleware } = require('../auth');

router.get('/:studentId', authMiddleware, evaluationController.getEvaluation);
router.post('/', authMiddleware, evaluationController.submitEvaluation);

module.exports = router;
