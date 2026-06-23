export default function EmptyState({ title, description }) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center py-20 px-6 rounded-xl border"
      style={{ borderColor: "var(--border-soft)", borderStyle: "dashed" }}
    >
      <p
        className="text-sm font-semibold mb-1.5"
        style={{ color: "var(--text-secondary)" }}
      >
        {title}
      </p>
      <p className="text-sm max-w-sm" style={{ color: "var(--text-muted)" }}>
        {description}
      </p>
    </div>
  );
}
