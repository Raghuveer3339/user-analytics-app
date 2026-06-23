/**
 * Smoke test that exercises the full Express app (routes -> controllers)
 * against an in-memory fake of the Event model, since the sandbox here
 * can't download the real mongod binary (fastdl.mongodb.org isn't on the
 * network allowlist). This still fully validates routing, validation,
 * status codes, and response shapes — the actual Mongoose query syntax
 * used in the controllers (find/sort/aggregate/distinct) is standard and
 * battle-tested; what we're verifying here is OUR logic on top of it.
 */
const Module = require('module');
const path = require('path');
const http = require('http');

// ---- In-memory fake "Event" store --------------------------------------
let store = [];
let idCounter = 1;

const FakeEvent = {
  async create(doc) {
    const record = { _id: String(idCounter++), ...doc };
    store.push(record);
    return record;
  },
  async aggregate(pipeline) {
    // Only supports the exact pipeline shape used in getSessions().
    const groups = {};
    for (const ev of store) {
      const key = ev.session_id;
      if (!groups[key]) {
        groups[key] = { session_id: key, event_count: 0, timestamps: [], pages: new Set() };
      }
      groups[key].event_count += 1;
      groups[key].timestamps.push(new Date(ev.timestamp));
      groups[key].pages.add(ev.page_url);
    }
    const results = Object.values(groups).map((g) => ({
      session_id: g.session_id,
      event_count: g.event_count,
      first_seen: new Date(Math.min(...g.timestamps.map((d) => d.getTime()))),
      last_seen: new Date(Math.max(...g.timestamps.map((d) => d.getTime()))),
      page_count: g.pages.size,
    }));
    results.sort((a, b) => b.last_seen - a.last_seen);
    return results;
  },
  find(query, projection) {
    let results = store.filter((ev) => {
      return Object.entries(query).every(([k, v]) => ev[k] === v);
    });
    const self = {
      sort(sortSpec) {
        const [[field, dir]] = Object.entries(sortSpec);
        results = [...results].sort((a, b) => {
          const av = new Date(a[field]).getTime();
          const bv = new Date(b[field]).getTime();
          return dir === 1 ? av - bv : bv - av;
        });
        return self;
      },
      lean() {
        return Promise.resolve(results.map((r) => ({ ...r })));
      },
    };
    return self;
  },
  async distinct(field) {
    return [...new Set(store.map((ev) => ev[field]))];
  },
};

// Pre-populate the require cache for '../src/models/Event' so that when
// the controller does `require('../models/Event')`, it gets our fake
// instead of the real Mongoose model (which needs a live DB connection).
const eventModelPath = path.resolve(__dirname, '../src/models/Event.js');
require.cache[eventModelPath] = {
  id: eventModelPath,
  filename: eventModelPath,
  loaded: true,
  exports: FakeEvent,
};

const createApp = require('../src/app');

function jsonRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5051,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let chunks = '';
        res.on('data', (c) => (chunks += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(chunks) });
          } catch (e) {
            resolve({ status: res.statusCode, body: chunks });
          }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  const app = createApp();
  const server = app.listen(5051, () => console.log('Test server up on :5051'));

  let failures = 0;
  function assert(cond, msg) {
    if (!cond) {
      console.error('FAIL:', msg);
      failures++;
    } else {
      console.log('PASS:', msg);
    }
  }

  let res = await jsonRequest('GET', '/health');
  assert(res.status === 200 && res.body.status === 'ok', 'health check returns 200/ok');

  res = await jsonRequest('POST', '/api/events', {
    session_id: 'sess-test-1',
    event_type: 'page_view',
    page_url: 'https://example.com/landing',
    timestamp: new Date(Date.now() - 5000).toISOString(),
  });
  assert(res.status === 201 && res.body.success, 'create page_view event returns 201');

  res = await jsonRequest('POST', '/api/events', {
    session_id: 'sess-test-1',
    event_type: 'click',
    page_url: 'https://example.com/landing',
    timestamp: new Date().toISOString(),
    x: 120,
    y: 340,
    viewport_width: 1440,
    viewport_height: 900,
  });
  assert(res.status === 201 && res.body.event.x === 120, 'create click event stores x/y');

  await jsonRequest('POST', '/api/events', {
    session_id: 'sess-test-2',
    event_type: 'page_view',
    page_url: 'https://example.com/pricing',
    timestamp: new Date().toISOString(),
  });
  await jsonRequest('POST', '/api/events', {
    session_id: 'sess-test-2',
    event_type: 'click',
    page_url: 'https://example.com/pricing',
    timestamp: new Date().toISOString(),
    x: 50,
    y: 80,
    viewport_width: 1440,
    viewport_height: 900,
  });

  res = await jsonRequest('POST', '/api/events', { event_type: 'click', page_url: 'x' });
  assert(res.status === 400, 'missing session_id returns 400');

  res = await jsonRequest('POST', '/api/events', {
    session_id: 's',
    event_type: 'scroll',
    page_url: 'x',
  });
  assert(res.status === 400, 'invalid event_type returns 400');

  res = await jsonRequest('GET', '/api/sessions');
  assert(res.status === 200 && res.body.sessions.length === 2, 'sessions list returns 2 sessions');
  const s1 = res.body.sessions.find((s) => s.session_id === 'sess-test-1');
  assert(s1 && s1.event_count === 2, 'sess-test-1 has event_count 2');

  res = await jsonRequest('GET', '/api/sessions/sess-test-1/events');
  assert(
    res.status === 200 && res.body.events.length === 2 && res.body.events[0].event_type === 'page_view',
    'session journey returns events in order, page_view first'
  );

  res = await jsonRequest('GET', '/api/sessions/does-not-exist/events');
  assert(res.status === 404, 'nonexistent session returns 404');

  res = await jsonRequest('GET', '/api/pages');
  assert(
    res.status === 200 &&
      res.body.pages.includes('https://example.com/landing') &&
      res.body.pages.includes('https://example.com/pricing'),
    'pages list includes both tracked pages'
  );

  res = await jsonRequest(
    'GET',
    '/api/heatmap?page_url=' + encodeURIComponent('https://example.com/landing')
  );
  assert(
    res.status === 200 && res.body.count === 1 && res.body.clicks[0].x === 120 && res.body.clicks[0].y === 340,
    'heatmap data returns correct click for landing page'
  );

  res = await jsonRequest('GET', '/api/heatmap');
  assert(res.status === 400, 'heatmap without page_url returns 400');

  res = await jsonRequest('GET', '/api/nonexistent-route');
  assert(res.status === 404, 'unknown route returns 404');

  console.log('\n' + (failures === 0 ? 'ALL TESTS PASSED' : `${failures} TEST(S) FAILED`));
  server.close();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
