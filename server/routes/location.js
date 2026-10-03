const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { authMiddleware } = require('../auth');

// Student pings their current location while clocked in
router.post('/ping', authMiddleware, locationController.pingLocation);

// Supervisor fetches the latest location for all currently clocked-in interns
router.get('/interns', authMiddleware, locationController.getActiveInternLocations);

module.exports = router;
