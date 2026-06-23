const express = require('express');
const router = express.Router();
const {
  createEvent,
  getSessions,
  getSessionEvents,
  getPages,
  getHeatmapData,
} = require('../controllers/eventController');

// Ingestion
router.post('/events', createEvent);

// Sessions view
router.get('/sessions', getSessions);
router.get('/sessions/:sessionId/events', getSessionEvents);

// Heatmap view
router.get('/pages', getPages);
router.get('/heatmap', getHeatmapData);

module.exports = router;
