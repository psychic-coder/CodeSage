import type { ArchitectureAnswer } from "@/types";

interface Props {
  result: ArchitectureAnswer;
}

export function ArchQnAPanel({ result }: Props) {
  return (
    <div className="animate-fadeIn" style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div style={{
        padding: "var(--space-6)",
        background: "var(--color-surface)",
        borderRadius: "var(--radius-xl)",
        border: "1px solid var(--color-border)",
        boxShadow: "var(--shadow-sm)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
          <span style={{ padding: "4px 8px", background: "var(--color-primary-highlight)", color: "var(--color-primary)", fontSize: "var(--text-xs)", fontWeight: 700, borderRadius: "var(--radius-sm)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Architecture Answer
          </span>
        </div>
        
        <div 
          style={{ fontSize: "var(--text-base)", color: "var(--color-text)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}
        >
          {result.answer}
        </div>
      </div>

      {result.execution_flow && result.execution_flow.length > 0 && (
        <div className="panel pad">
          <h3 style={{ marginBottom: "var(--space-4)", fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Execution Flow
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {result.execution_flow.map((step, index) => (
              <div key={index} style={{ 
                display: "flex", alignItems: "flex-start", gap: "var(--space-4)",
                padding: "var(--space-3)", borderRadius: "var(--radius-md)",
                background: "var(--color-surface-2)"
              }}>
                <div style={{
                  minWidth: 24, height: 24, borderRadius: "50%",
                  background: "var(--color-surface-offset)", color: "var(--color-text-muted)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "var(--text-xs)", fontWeight: 700, flexShrink: 0, marginTop: 2
                }}>
                  {step.step || index + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text)", lineHeight: 1.5 }}>
                    {step.description}
                  </p>
                  {step.file && (
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--color-primary)", marginTop: "var(--space-1)", fontFamily: "monospace" }}>
                      ↳ {step.file}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.relevant_files && result.relevant_files.length > 0 && (
        <div className="panel pad">
          <h3 style={{ marginBottom: "var(--space-3)", fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Relevant Files
          </h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {result.relevant_files.map((file, i) => (
              <li key={i} style={{ 
                padding: "var(--space-2) var(--space-3)", 
                background: "var(--color-surface-offset)", 
                borderRadius: "var(--radius-md)",
                fontSize: "var(--text-xs)",
                fontFamily: "monospace",
                color: "var(--color-text-muted)",
                display: "flex",
                alignItems: "center"
              }}>
                <span style={{ marginRight: "var(--space-2)", opacity: 0.5 }}>📄</span>
                {file}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
