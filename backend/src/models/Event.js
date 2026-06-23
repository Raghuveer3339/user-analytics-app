const mongoose = require('mongoose');

/**
 * A single tracked interaction on the page.
 *
 * Design notes:
 * - We store every event (page_view, click) as one document in a single
 *   collection. This keeps writes simple (one insert per event) and makes
 *   "ordered list of events for a session" a single indexed query.
 * - `x` and `y` are only populated for click events but are kept on the
 *   same schema rather than a separate collection, since heatmap queries
 *   just need to filter events by type + page and project x/y.
 * - Compound indexes are added for the two access patterns we actually
 *   query by: (session_id, timestamp) for the journey view, and
 *   (page_url, event_type) for the heatmap view.
 */
const eventSchema = new mongoose.Schema(
  {
    session_id: {
      type: String,
      required: true,
      index: true,
    },
    event_type: {
      type: String,
      required: true,
      enum: ['page_view', 'click'],
    },
    page_url: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    x: {
      type: Number, // viewport-relative x coordinate, click events only
      default: null,
    },
    y: {
      type: Number, // viewport-relative y coordinate, click events only
      default: null,
    },
    // Extra context that's cheap to capture and useful for debugging /
    // future analytics, without being part of the core requirements.
    viewport_width: { type: Number, default: null },
    viewport_height: { type: Number, default: null },
    user_agent: { type: String, default: null },
  },
  {
    timestamps: false, // we track our own `timestamp` field from the client
    versionKey: false,
  }
);

eventSchema.index({ session_id: 1, timestamp: 1 });
eventSchema.index({ page_url: 1, event_type: 1 });

module.exports = mongoose.model('Event', eventSchema);
