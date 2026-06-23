"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getSessionEvents } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/Card";
import EmptyState from "@/components/EmptyState";

const EVENT_META = {
  page_view: { label: "Page view", color: "var(--success)" },
  click: { label: "Click", color: "var(--click-dot)" },
};

function formatTimestamp(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function SessionJourneyPage() {
  const params = useParams();
  const sessionId = decodeURIComponent(params.sessionId);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getSessionEvents(sessionId);
        if (!cancelled) setEvents(data.events || []);
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
  }, [sessionId]);

  return (
    <div>
      <PageHeader
        eyebrow="Session journey"
        title={sessionId}
        description="Every event for this session, in the order it happened."
        right={
          <Link
            href="/sessions"
            className="text-xs font-medium px-3 py-1.5 rounded-md border"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
          >
            ← All sessions
          </Link>
        }
      />

      <div className="px-10 py-8">
        {loading && (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-12 rounded-lg animate-pulse"
                style={{ background: "var(--bg-card)" }}
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <EmptyState title="Couldn't load this session" description={error} />
        )}

        {!loading && !error && events.length === 0 && (
          <EmptyState
            title="No events found"
            description="This session ID doesn't have any recorded events."
          />
        )}

        {!loading && !error && events.length > 0 && (
          <Card className="p-2">
            <ol className="relative">
              {events.map((event, idx) => {
                const meta = EVENT_META[event.event_type] || {
                  label: event.event_type,
                  color: "var(--text-muted)",
                };
                const isLast = idx === events.length - 1;

                return (
                  <li key={idx} className="relative flex gap-4 px-4 py-3.5">
                    <div className="flex flex-col items-center">
                      <span
                        className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                        style={{ background: meta.color }}
                      />
                      {!isLast && (
                        <span
                          className="w-px flex-1 mt-1"
                          style={{ background: "var(--border)" }}
                        />
                      )}
                    </div>

                    <div className="flex-1 pb-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span
                          className="text-sm font-semibold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {meta.label}
                        </span>
                        <span
                          className="text-[0.7rem]"
                          style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
                        >
                          {formatTimestamp(event.timestamp)}
                        </span>
                      </div>

                      <p
                        className="text-sm mt-0.5 truncate max-w-xl"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {event.page_url}
                      </p>

                      {event.event_type === "click" && (
                        <p
                          className="text-xs mt-1"
                          style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
                        >
                          x: {event.x} · y: {event.y}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>
        )}
      </div>
    </div>
  );
}
