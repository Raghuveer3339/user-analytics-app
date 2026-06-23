const Event = require('../models/Event');

/**
 * POST /api/events
 * Receive and store a single tracked event from the client script.
 *
 * We validate just enough to keep bad data out of the DB without being
 * so strict that a minor client bug (e.g. missing x/y on a page_view)
 * causes a dropped event.
 */
async function createEvent(req, res) {
  try {
    const { session_id, event_type, page_url, timestamp, x, y } = req.body;

    if (!session_id || !event_type || !page_url) {
      return res.status(400).json({
        error: 'session_id, event_type, and page_url are required.',
      });
    }

    if (!['page_view', 'click'].includes(event_type)) {
      return res.status(400).json({
        error: `event_type must be one of 'page_view' or 'click'.`,
      });
    }

    const event = await Event.create({
      session_id,
      event_type,
      page_url,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      x: typeof x === 'number' ? x : null,
      y: typeof y === 'number' ? y : null,
      viewport_width: req.body.viewport_width ?? null,
      viewport_height: req.body.viewport_height ?? null,
      user_agent: req.headers['user-agent'] ?? null,
    });

    return res.status(201).json({ success: true, event });
  } catch (err) {
    console.error('createEvent error:', err);
    return res.status(500).json({ error: 'Failed to store event.' });
  }
}

/**
 * GET /api/sessions
 * Fetch all sessions with their total event count, most recent activity
 * first. Uses an aggregation pipeline so the count happens in MongoDB
 * rather than pulling every event into Node.
 */
async function getSessions(req, res) {
  try {
    const sessions = await Event.aggregate([
      {
        $group: {
          _id: '$session_id',
          event_count: { $sum: 1 },
          first_seen: { $min: '$timestamp' },
          last_seen: { $max: '$timestamp' },
          pages: { $addToSet: '$page_url' },
        },
      },
      {
        $project: {
          _id: 0,
          session_id: '$_id',
          event_count: 1,
          first_seen: 1,
          last_seen: 1,
          page_count: { $size: '$pages' },
        },
      },
      { $sort: { last_seen: -1 } },
    ]);

    return res.json({ success: true, sessions });
  } catch (err) {
    console.error('getSessions error:', err);
    return res.status(500).json({ error: 'Failed to fetch sessions.' });
  }
}

/**
 * GET /api/sessions/:sessionId/events
 * Fetch the ordered list of events for one session — the "user journey".
 */
async function getSessionEvents(req, res) {
  try {
    const { sessionId } = req.params;

    const events = await Event.find({ session_id: sessionId })
      .sort({ timestamp: 1 })
      .lean();

    if (events.length === 0) {
      return res.status(404).json({ error: 'No events found for this session.' });
    }

    return res.json({ success: true, session_id: sessionId, events });
  } catch (err) {
    console.error('getSessionEvents error:', err);
    return res.status(500).json({ error: 'Failed to fetch session events.' });
  }
}

/**
 * GET /api/pages
 * Convenience endpoint: list distinct page URLs that have been tracked,
 * so the frontend's heatmap page-selector can be populated dynamically.
 */
async function getPages(req, res) {
  try {
    const pages = await Event.distinct('page_url');
    return res.json({ success: true, pages });
  } catch (err) {
    console.error('getPages error:', err);
    return res.status(500).json({ error: 'Failed to fetch pages.' });
  }
}

/**
 * GET /api/heatmap?page_url=...
 * Fetch click x/y coordinates for a specific page, for heatmap rendering.
 */
async function getHeatmapData(req, res) {
  try {
    const { page_url } = req.query;

    if (!page_url) {
      return res.status(400).json({ error: 'page_url query parameter is required.' });
    }

    const clicks = await Event.find(
      { page_url, event_type: 'click' },
      { x: 1, y: 1, viewport_width: 1, viewport_height: 1, timestamp: 1, _id: 0 }
    ).lean();

    return res.json({ success: true, page_url, count: clicks.length, clicks });
  } catch (err) {
    console.error('getHeatmapData error:', err);
    return res.status(500).json({ error: 'Failed to fetch heatmap data.' });
  }
}

module.exports = {
  createEvent,
  getSessions,
  getSessionEvents,
  getPages,
  getHeatmapData,
};
