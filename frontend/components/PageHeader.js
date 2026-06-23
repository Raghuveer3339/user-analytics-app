export default function PageHeader({ eyebrow, title, description, right }) {
  return (
    <div
      className="flex items-start justify-between gap-6 px-10 py-8 border-b"
      style={{ borderColor: "var(--border-soft)" }}
    >
      <div>
        {eyebrow && (
          <p
            className="text-[0.7rem] font-medium uppercase tracking-[0.12em] mb-2"
            style={{ fontFamily: "var(--font-mono)", color: "var(--accent-strong)" }}
          >
            {eyebrow}
          </p>
        )}
        <h1
          className="text-[1.6rem] font-semibold tracking-tight mb-1.5"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        >
          {title}
        </h1>
        {description && (
          <p className="text-sm max-w-lg" style={{ color: "var(--text-secondary)" }}>
            {description}
          </p>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}
