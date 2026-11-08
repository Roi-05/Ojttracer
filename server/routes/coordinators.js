const express = require('express');
const router = express.Router();
const coordinatorController = require('../controllers/coordinatorController');
const { authMiddleware } = require('../auth');

router.get('/', authMiddleware, coordinatorController.getCoordinators);
router.post('/', authMiddleware, coordinatorController.createCoordinator);
router.put('/:id', authMiddleware, coordinatorController.updateCoordinator);
router.delete('/:id', authMiddleware, coordinatorController.deleteCoordinator);

module.exports = router;

