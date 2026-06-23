"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/sessions", label: "Sessions", glyph: "01" },
  { href: "/heatmap", label: "Heatmap", glyph: "02" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-[220px] shrink-0 flex flex-col justify-between border-r px-5 py-6"
      style={{ borderColor: "var(--border-soft)", background: "var(--bg-elevated)" }}
    >
      <div>
        <Link href="/sessions" className="flex items-center gap-2 mb-10 px-1">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full relative"
            style={{ background: "var(--success)" }}
          >
            <span
              className="absolute inset-0 rounded-full animate-ping"
              style={{ background: "var(--success)", opacity: 0.5 }}
            />
          </span>
          <span
            className="font-semibold tracking-tight text-[1.05rem]"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            Pulse
          </span>
        </Link>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors"
                style={{
                  background: active ? "var(--accent-soft)" : "transparent",
                  color: active ? "var(--accent-strong)" : "var(--text-secondary)",
                }}
              >
                <span
                  className="text-[0.7rem]"
                  style={{ fontFamily: "var(--font-mono)", color: active ? "var(--accent-strong)" : "var(--text-muted)" }}
                >
                  {item.glyph}
                </span>
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div
        className="text-[0.7rem] leading-relaxed px-1"
        style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
      >
        <div className="mb-1">user-analytics-app</div>
        <div>built by Raghuveer · CausalFunnel</div>
      </div>
    </aside>
  );
}
