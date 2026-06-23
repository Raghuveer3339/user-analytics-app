"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSessions } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/Card";
import EmptyState from "@/components/EmptyState";

function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.round(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getSessions();
        if (!cancelled) setSessions(data.sessions || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Sessions"
        title="All tracked sessions"
        description="Every unique session captured by the tracking script, sorted by most recent activity."
      />

      <div className="px-10 py-8">
        {loading && (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-14 rounded-lg animate-pulse"
                style={{ background: "var(--bg-card)" }}
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <EmptyState
            title="Couldn't reach the API"
            description={`${error} — make sure the backend is running and NEXT_PUBLIC_API_URL is set correctly.`}
          />
        )}

        {!loading && !error && sessions.length === 0 && (
          <EmptyState
            title="No sessions yet"
            description="Open the demo page with the tracking script installed and click around — sessions will appear here within seconds."
          />
        )}

        {!loading && !error && sessions.length > 0 && (
          <Card>
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="text-left border-b"
                  style={{ borderColor: "var(--border-soft)" }}
                >
                  <th className="px-5 py-3.5 font-medium" style={{ color: "var(--text-muted)" }}>
                    Session
                  </th>
                  <th className="px-5 py-3.5 font-medium" style={{ color: "var(--text-muted)" }}>
                    Events
                  </th>
                  <th className="px-5 py-3.5 font-medium" style={{ color: "var(--text-muted)" }}>
                    Pages visited
                  </th>
                  <th className="px-5 py-3.5 font-medium" style={{ color: "var(--text-muted)" }}>
                    Last seen
                  </th>
                  <th className="px-5 py-3.5"></th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr
                    key={session.session_id}
                    className="border-b last:border-b-0 transition-colors hover:bg-white/[0.02]"
                    style={{ borderColor: "var(--border-soft)" }}
                  >
                    <td className="px-5 py-3.5">
                      <span
                        className="text-[0.8rem]"
                        style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}
                      >
                        {session.session_id}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className="inline-flex items-center justify-center min-w-[1.6rem] px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ background: "var(--accent-soft)", color: "var(--accent-strong)" }}
                      >
                        {session.event_count}
                      </span>
                    </td>
                    <td className="px-5 py-3.5" style={{ color: "var(--text-secondary)" }}>
                      {session.page_count}
                    </td>
                    <td className="px-5 py-3.5" style={{ color: "var(--text-secondary)" }}>
                      {formatRelativeTime(session.last_seen)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/sessions/${encodeURIComponent(session.session_id)}`}
                        className="text-xs font-medium px-3 py-1.5 rounded-md border transition-colors"
                        style={{ borderColor: "var(--border)", color: "var(--accent-strong)" }}
                      >
                        View journey →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
