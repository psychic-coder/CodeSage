import type { TechIntegrationResult } from "@/types";
import { FileChangeList } from "./FileChangeList";

interface Props {
  result: TechIntegrationResult;
}

const COMPLEXITY_COLOR: Record<string, string> = {
  low: "var(--color-success)",
  medium: "var(--color-warning)",
  high: "var(--color-error)",
  very_high: "var(--color-error)",
};

export function TechIntegrationPanel({ result }: Props) {
  return (
    <div className="animate-fadeIn" style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div style={{
        padding: "var(--space-5)",
        background: "var(--color-surface)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border)",
      }}>
        <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 700, marginBottom: "var(--space-2)" }}>
          {result.technology} Integration Guide
        </h2>
        <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)", lineHeight: 1.6 }}>
          {result.summary}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--space-3)" }}>
        <div className="panel pad">
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>Files to Modify</p>
          <p style={{ fontSize: "var(--text-xl)", fontWeight: 800, color: "var(--color-warning)" }}>
            {result.files_to_modify?.length ?? 0}
          </p>
        </div>
        <div className="panel pad">
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>Files to Create</p>
          <p style={{ fontSize: "var(--text-xl)", fontWeight: 800, color: "var(--color-success)" }}>
            {result.files_to_create?.length ?? 0}
          </p>
        </div>
        <div className="panel pad">
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>Dependencies</p>
          <p style={{ fontSize: "var(--text-xl)", fontWeight: 800, color: "var(--color-primary)" }}>
            {result.dependencies_to_add?.length ?? 0}
          </p>
        </div>
        <div className="panel pad">
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>Complexity</p>
          <p style={{ fontSize: "var(--text-base)", fontWeight: 700, color: COMPLEXITY_COLOR[result.estimated_complexity] || "var(--color-text)", textTransform: "capitalize" }}>
            {result.estimated_complexity?.replace("_", " ")}
          </p>
        </div>
      </div>

      {result.dependencies_to_add?.length > 0 && (
        <div className="panel pad">
          <h3 style={{ marginBottom: "var(--space-2)", fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Required Dependencies
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
            {result.dependencies_to_add.map((dep) => (
              <span key={dep} style={{ padding: "4px 10px", borderRadius: "var(--radius-md)", background: "var(--color-surface-offset)", color: "var(--color-text)", fontSize: "var(--text-xs)", fontFamily: "monospace" }}>
                {dep}
              </span>
            ))}
          </div>
        </div>
      )}

      {result.integration_steps?.length > 0 && (
        <div className="panel pad">
          <h3 style={{ marginBottom: "var(--space-4)", fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Implementation Steps
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {result.integration_steps.map((step, index) => (
              <div key={index} style={{ display: "flex", gap: "var(--space-4)" }}>
                <div style={{
                  minWidth: 32, height: 32, borderRadius: "50%",
                  background: "var(--color-primary-highlight)", color: "var(--color-primary)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "var(--text-sm)", fontWeight: 800, flexShrink: 0
                }}>
                  {step.step || index + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: "var(--text-base)", fontWeight: 700, marginBottom: "var(--space-1)" }}>{step.title}</h4>
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", lineHeight: 1.5, marginBottom: "var(--space-2)" }}>
                    {step.description}
                  </p>
                  {step.files && step.files.length > 0 && (
                    <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                      {step.files.map((f, i) => (
                        <span key={i} style={{ fontSize: "var(--text-xs)", color: "var(--color-text-faint)", background: "var(--color-surface-2)", padding: "2px 6px", borderRadius: "var(--radius-sm)", fontFamily: "monospace" }}>
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <FileChangeList title="Files to Modify" files={result.files_to_modify ?? []} accent="var(--color-warning)" />
      <FileChangeList title="Files to Create" files={result.files_to_create ?? []} accent="var(--color-success)" />
    </div>
  );
}
