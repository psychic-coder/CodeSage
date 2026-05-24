import { RiskBadge } from "./RiskBadge";
import type { ImpactFile } from "@/types";

interface Props {
  title: string;
  files: ImpactFile[];
  accent?: string;
}

const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export function FileChangeList({ title, files, accent }: Props) {
  if (!files || files.length === 0) return null;
  const sorted = [...files].sort((a, b) => (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4));

  return (
    <div style={{ marginBottom: "var(--space-6)" }}>
      <h3 style={{
        fontSize: "var(--text-sm)", fontWeight: 700, marginBottom: "var(--space-3)",
        color: accent || "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em"
      }}>{title} <span style={{ color: "var(--color-text-faint)" }}>({files.length})</span></h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {sorted.map((f, i) => (
          <div key={i} style={{
            padding: "var(--space-3) var(--space-4)",
            background: "var(--color-surface)", border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-2)", flexWrap: "wrap" }}>
              <code style={{ fontSize: "var(--text-xs)", color: "var(--color-primary)", fontFamily: "monospace" }}>{f.path}</code>
              <RiskBadge label={f.priority} score={f.priority === "critical" ? 0.9 : f.priority === "high" ? 0.7 : f.priority === "medium" ? 0.4 : 0.1} />
            </div>
            {f.reason && <p style={{ marginTop: "var(--space-1)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>{f.reason}</p>}
            {f.suggested_changes && (
              <p style={{ marginTop: "var(--space-1)", fontSize: "var(--text-xs)", color: "var(--color-text-faint)", fontStyle: "italic" }}>
                → {f.suggested_changes}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
