export function RiskBadge({ score, label }: { score?: number; label?: string }) {
  const value = score ?? 0;
  const text = label || (value >= 0.7 ? "High" : value >= 0.4 ? "Medium" : "Low");
  const color = value >= 0.7 ? "var(--color-error)" : value >= 0.4 ? "var(--color-warning)" : "var(--color-success)";
  const bg = value >= 0.7 ? "var(--color-error-highlight)" : value >= 0.4 ? "var(--color-warning-highlight)" : "var(--color-success-highlight)";

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "var(--space-1)",
      padding: "2px var(--space-2)", borderRadius: "var(--radius-full)",
      background: bg, color, fontSize: "var(--text-xs)", fontWeight: 600
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block" }} />
      {text}
    </span>
  );
}
