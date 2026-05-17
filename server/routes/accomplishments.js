const express = require('express');
const router = express.Router();
const accomplishmentController = require('../controllers/accomplishmentController');
const { authMiddleware } = require('../auth');

router.post('/', authMiddleware, accomplishmentController.createAccomplishment);
router.get('/', authMiddleware, accomplishmentController.getAccomplishments);
router.put('/:studentId/:id/review', authMiddleware, accomplishmentController.reviewAccomplishment);

module.exports = router;
