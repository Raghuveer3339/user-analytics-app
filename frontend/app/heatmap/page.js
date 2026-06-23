"use client";

import { useEffect, useState } from "react";
import { getPages, getHeatmapData } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/Card";
import EmptyState from "@/components/EmptyState";

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;

export default function HeatmapPage() {
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState("");
  const [clicks, setClicks] = useState([]);
  const [pagesLoading, setPagesLoading] = useState(true);
  const [clicksLoading, setClicksLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPages() {
      try {
        const data = await getPages();
        if (!cancelled) {
          setPages(data.pages || []);
          if (data.pages && data.pages.length > 0) {
            setSelectedPage(data.pages[0]);
          }
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setPagesLoading(false);
      }
    }

    loadPages();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedPage) return;
    let cancelled = false;

    async function loadClicks() {
      setClicksLoading(true);
      try {
        const data = await getHeatmapData(selectedPage);
        if (!cancelled) setClicks(data.clicks || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setClicksLoading(false);
      }
    }

    loadClicks();
    return () => {
      cancelled = true;
    };
  }, [selectedPage]);

  // Normalize each click's x/y (captured at the visitor's own viewport size)
  // onto our fixed canvas, so clicks from different screen sizes still plot
  // sensibly relative to one another.
  const normalizedClicks = clicks
    .filter((c) => typeof c.x === "number" && typeof c.y === "number")
    .map((c) => {
      const vw = c.viewport_width || CANVAS_WIDTH;
      const vh = c.viewport_height || CANVAS_HEIGHT;
      return {
        x: (c.x / vw) * CANVAS_WIDTH,
        y: (c.y / vh) * CANVAS_HEIGHT,
      };
    });

  return (
    <div>
      <PageHeader
        eyebrow="Heatmap"
        title="Click distribution"
        description="Every recorded click for a page, plotted by its position on screen."
        right={
          !pagesLoading &&
          pages.length > 0 && (
            <select
              value={selectedPage}
              onChange={(e) => setSelectedPage(e.target.value)}
              className="text-sm px-3 py-2 rounded-md border bg-transparent"
              style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
            >
              {pages.map((page) => (
                <option key={page} value={page} style={{ background: "var(--bg-card)" }}>
                  {page}
                </option>
              ))}
            </select>
          )
        }
      />

      <div className="px-10 py-8">
        {pagesLoading && (
          <div
            className="h-[420px] rounded-xl animate-pulse"
            style={{ background: "var(--bg-card)" }}
          />
        )}

        {!pagesLoading && error && (
          <EmptyState title="Couldn't reach the API" description={error} />
        )}

        {!pagesLoading && !error && pages.length === 0 && (
          <EmptyState
            title="No pages tracked yet"
            description="Once the tracking script records click events on a page, it'll show up in the selector above."
          />
        )}

        {!pagesLoading && !error && pages.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {clicksLoading
                  ? "Loading clicks…"
                  : `${normalizedClicks.length} click${normalizedClicks.length === 1 ? "" : "s"} recorded`}
              </p>
            </div>

            <div
              className="relative w-full rounded-lg border overflow-hidden"
              style={{
                borderColor: "var(--border-soft)",
                background:
                  "repeating-linear-gradient(0deg, var(--bg-elevated) 0, var(--bg-elevated) 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, var(--bg-elevated) 0, var(--bg-elevated) 1px, transparent 1px, transparent 40px), var(--bg)",
                aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
              }}
            >
              {!clicksLoading &&
                normalizedClicks.map((c, i) => (
                  <span
                    key={i}
                    className="absolute rounded-full"
                    style={{
                      left: `${(c.x / CANVAS_WIDTH) * 100}%`,
                      top: `${(c.y / CANVAS_HEIGHT) * 100}%`,
                      width: 14,
                      height: 14,
                      marginLeft: -7,
                      marginTop: -7,
                      background: "var(--click-dot)",
                      opacity: 0.55,
                      boxShadow: "0 0 0 4px rgba(255,107,107,0.15)",
                    }}
                  />
                ))}

              {!clicksLoading && normalizedClicks.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    No clicks recorded for this page yet
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
