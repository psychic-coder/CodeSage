import type { ImpactResult } from "@/types";
import { FileChangeList } from "./FileChangeList";

interface Props {
  result?: ImpactResult | null;
  loading?: boolean;
  error?: string;
}

const COMPLEXITY_COLOR: Record<string, string> = {
  low: "var(--color-success)",
  medium: "var(--color-warning)",
  high: "var(--color-error)",
  very_high: "var(--color-error)",
};

export default function ImpactPanel({ result, loading, error }: Props) {
  if (loading) {
    return <div className="panel pad">Analyzing impact…</div>;
  }

  if (error) {
    return <div className="panel pad" style={{ color: "var(--color-error)" }}>{error}</div>;
  }

  if (!result) {
    return <div className="panel pad">Describe a feature to see the impact analysis.</div>;
  }

  const totalTouched = (result.files_to_modify?.length ?? 0) + (result.files_to_create?.length ?? 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--space-3)" }}>
        {[
          { label: "Files to Modify", value: result.files_to_modify?.length ?? 0, color: "var(--color-warning)" },
          { label: "Files to Create", value: result.files_to_create?.length ?? 0, color: "var(--color-success)" },
          { label: "Downstream Risks", value: result.downstream_risks?.length ?? 0, color: "var(--color-error)" },
          { label: "Touched Files", value: totalTouched, color: "var(--color-primary)" },
        ].map((item) => (
          <div key={item.label} className="panel pad" style={{ borderColor: item.color }}>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>{item.label}</p>
            <p style={{ fontSize: "var(--text-xl)", fontWeight: 800, color: item.color }}>{item.value}</p>
          </div>
        ))}
        <div className="panel pad">
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>Complexity</p>
          <p style={{ fontSize: "var(--text-base)", fontWeight: 700, color: COMPLEXITY_COLOR[result.estimated_complexity] || "var(--color-text)" }}>
            {result.estimated_complexity?.replace("_", " ")}
          </p>
        </div>
      </div>

      {result.dependencies_to_add?.length > 0 && (
        <div className="panel pad">
          <h3 style={{ marginBottom: "var(--space-2)" }}>Dependencies to add</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
            {result.dependencies_to_add.map((dep) => (
              <span key={dep} style={{ padding: "2px 8px", borderRadius: "var(--radius-full)", background: "var(--color-primary-highlight)", color: "var(--color-primary)", fontSize: "var(--text-xs)" }}>
                {dep}
              </span>
            ))}
          </div>
        </div>
      )}

      <FileChangeList title="Files to Modify" files={result.files_to_modify ?? []} accent="var(--color-warning)" />
      <FileChangeList title="Files to Create" files={result.files_to_create ?? []} accent="var(--color-success)" />

      {result.downstream_risks?.length > 0 && (
        <div className="panel pad">
          <h3 style={{ marginBottom: "var(--space-3)" }}>Downstream risks</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {result.downstream_risks.map((risk, index) => (
              <div key={`${risk.file}-${index}`} style={{ padding: "var(--space-3)", borderRadius: "var(--radius-md)", background: "var(--color-error-highlight)", border: "1px solid var(--color-error)" }}>
                <code style={{ fontSize: "var(--text-xs)", color: "var(--color-error)", wordBreak: "break-all" }}>{risk.file}</code>
                <p style={{ marginTop: "var(--space-1)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>{risk.risk}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.implementation_order?.length > 0 && (
        <div className="panel pad">
          <h3 style={{ marginBottom: "var(--space-3)" }}>Implementation order</h3>
          <ol style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", listStyle: "none", padding: 0 }}>
            {result.implementation_order.map((step, index) => (
              <li key={step} style={{ display: "flex", gap: "var(--space-3)" }}>
                <span style={{ minWidth: 24, height: 24, borderRadius: "50%", background: "var(--color-primary-highlight)", color: "var(--color-primary)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "var(--text-xs)", fontWeight: 700 }}>
                  {index + 1}
                </span>
                <span style={{ fontSize: "var(--text-sm)" }}>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
