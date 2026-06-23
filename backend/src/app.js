const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const eventRoutes = require('./routes/eventRoutes');

function createApp() {
  const app = express();

  // Security headers. CSP is disabled because the tracking script is meant
  // to be embedded on arbitrary third-party demo pages.
  app.use(helmet({ contentSecurityPolicy: false }));

  // CORS is wide open by design: the whole point of a tracking script is
  // that it gets dropped onto pages on other origins than the API.
app.use(
     cors({
       origin: true,
       credentials: true,
       methods: ['GET', 'POST'],
     })
   );

  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('dev'));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api', eventRoutes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Route not found.' });
  });

  // Generic error handler (catches anything that slips past try/catch)
  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  });

  return app;
}

module.exports = createApp;
