export default function Card({ children, className = "", ...props }) {
  return (
    <div
      className={`rounded-xl border ${className}`}
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      {...props}
    >
      {children}
    </div>
  );
}
