import { useState } from "react";
import type { ClarificationResponse } from "@/types";

interface Props {
  result: ClarificationResponse;
  onSubmit: (answers: Record<string, string>) => void;
  loading: boolean;
}

export function ClarificationChat({ result, onSubmit, loading }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleInputChange = (id: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [id]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(answers);
  };

  return (
    <div className="animate-fadeIn" style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div style={{
        padding: "var(--space-6)",
        background: "var(--color-surface)",
        borderRadius: "var(--radius-xl)",
        border: "1px solid var(--color-primary)",
        boxShadow: "0 0 20px var(--color-primary-highlight)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-6)" }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            background: "var(--color-primary-highlight)", color: "var(--color-primary)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem"
          }}>
            🤔
          </div>
          <div>
            <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 700 }}>I need a bit more detail</h2>
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>
              To give you the most accurate impact analysis, could you clarify:
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          {result.questions.map((q) => (
            <div key={q.id} style={{ 
              padding: "var(--space-4)", 
              background: "var(--color-surface-2)", 
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-border)"
            }}>
              <label style={{ 
                display: "block", fontSize: "var(--text-sm)", fontWeight: 600, 
                marginBottom: "var(--space-3)", color: "var(--color-text)" 
              }}>
                {q.question}
              </label>
              
              {q.options && q.options.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
                  {q.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleInputChange(q.id, opt)}
                      style={{
                        padding: "var(--space-2) var(--space-4)",
                        borderRadius: "var(--radius-full)",
                        fontSize: "var(--text-xs)",
                        fontWeight: 500,
                        border: `1px solid ${answers[q.id] === opt ? "var(--color-primary)" : "var(--color-border)"}`,
                        background: answers[q.id] === opt ? "var(--color-primary-highlight)" : "transparent",
                        color: answers[q.id] === opt ? "var(--color-primary)" : "var(--color-text-muted)",
                        transition: "all 0.2s ease"
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <textarea
                  value={answers[q.id] || ""}
                  onChange={(e) => handleInputChange(q.id, e.target.value)}
                  placeholder="Your answer..."
                  rows={2}
                  style={{
                    width: "100%", padding: "var(--space-3)", borderRadius: "var(--radius-md)",
                    background: "var(--color-surface)", border: "1px solid var(--color-border)",
                    color: "var(--color-text)", fontSize: "var(--text-sm)", outline: "none",
                    resize: "vertical"
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--color-primary)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--color-border)")}
                />
              )}
            </div>
          ))}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "var(--space-2)" }}>
            <button
              type="submit"
              disabled={loading || Object.keys(answers).length === 0}
              style={{
                padding: "var(--space-3) var(--space-6)",
                borderRadius: "var(--radius-md)",
                background: "var(--color-primary)",
                color: "#000",
                fontWeight: 700,
                fontSize: "var(--text-sm)",
                opacity: loading || Object.keys(answers).length === 0 ? 0.6 : 1,
                cursor: loading || Object.keys(answers).length === 0 ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: "var(--space-2)"
              }}
            >
              {loading ? (
                <>
                  <div style={{ width: 16, height: 16, border: "2px solid rgba(0,0,0,0.2)", borderTop: "2px solid #000", borderRadius: "50%" }} className="animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Continue Analysis →"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
