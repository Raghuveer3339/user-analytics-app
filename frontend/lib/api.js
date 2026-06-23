const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed with status ${res.status}`);
  }

  return res.json();
}

export function getSessions() {
  return request('/sessions');
}

export function getSessionEvents(sessionId) {
  return request(`/sessions/${encodeURIComponent(sessionId)}/events`);
}

export function getPages() {
  return request('/pages');
}

export function getHeatmapData(pageUrl) {
  return request(`/heatmap?page_url=${encodeURIComponent(pageUrl)}`);
}

export { API_BASE_URL };
