"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { analysisAPI } from "@/lib/api";
import { FileChangeList } from "@/components/analysis/FileChangeList";
import type { ImpactResult } from "@/types";

const COMPLEXITY_COLOR: Record<string, string> = {
  low: "var(--color-success)", medium: "var(--color-warning)",
  high: "var(--color-error)", very_high: "var(--color-error)"
};

export default function ImpactPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImpactResult | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!query.trim()) return;
    setError(""); setLoading(true); setResult(null);
    try {
      const res = await analysisAPI.impact(projectId, query.slice(0, 2000));
      setResult(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: "var(--space-8)", maxWidth: "var(--content-default)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-6)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
        <Link href="/dashboard" style={{ color: "var(--color-text-muted)", textDecoration: "none" }}>Projects</Link>
        <span>/</span>
        <Link href={`/dashboard/${projectId}`} style={{ color: "var(--color-text-muted)", textDecoration: "none" }}>Overview</Link>
        <span>/</span>
        <span style={{ color: "var(--color-text)" }}>Impact Predictor</span>
      </div>

      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 700, marginBottom: "var(--space-2)" }}>⚡ Feature Impact Predictor</h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-8)", fontSize: "var(--text-sm)" }}>
        Describe a feature you want to add. CodeSage will predict every file that needs to change.
      </p>

      <form onSubmit={handleSubmit} style={{ marginBottom: "var(--space-8)" }}>
        <div style={{
          background: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl)", overflow: "hidden"
        }}>
          <textarea
            value={query} onChange={e => setQuery(e.target.value.slice(0, 2000))}
            placeholder="e.g. Add two-factor authentication with OTP via email..."
            rows={4}
            style={{
              width: "100%", padding: "var(--space-4)", background: "none", border: "none",
              outline: "none", color: "var(--color-text)", fontSize: "var(--text-base)",
              resize: "none", lineHeight: 1.6
            }}
          />
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--color-border)"
          }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-faint)" }}>{query.length}/2000</span>
            <button type="submit" disabled={loading || !query.trim()} style={{
              padding: "var(--space-2) var(--space-5)", borderRadius: "var(--radius-md)",
              background: "var(--color-primary)", color: "#000", fontWeight: 700,
              fontSize: "var(--text-sm)", opacity: loading || !query.trim() ? 0.6 : 1,
              cursor: loading || !query.trim() ? "not-allowed" : "pointer"
            }}>
              {loading ? "Analyzing..." : "Predict Impact →"}
            </button>
          </div>
        </div>
      </form>

      {loading && (
        <div style={{ textAlign: "center", padding: "var(--space-12)" }}>
          <div style={{ width: 40, height: 40, border: "3px solid var(--color-surface-offset)", borderTop: "3px solid var(--color-primary)", borderRadius: "50%", marginInline: "auto", marginBottom: "var(--space-4)" }} className="animate-spin" />
          <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>Analyzing dependencies and predicting impact...</p>
        </div>
      )}

      {error && (
        <div style={{ padding: "var(--space-4)", borderRadius: "var(--radius-md)", background: "var(--color-error-highlight)", color: "var(--color-error)", marginBottom: "var(--space-6)" }}>
          {error}
        </div>
      )}

      {result && !loading && (
        <div className="animate-fadeIn">
          <div style={{
            display: "flex", gap: "var(--space-4)", flexWrap: "wrap", marginBottom: "var(--space-6)",
            padding: "var(--space-4)", background: "var(--color-surface)", borderRadius: "var(--radius-lg)",
            border: "1px solid var(--color-border)"
          }}>
            <div>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>Files to Modify</p>
              <p style={{ fontSize: "var(--text-lg)", fontWeight: 900, color: "var(--color-warning)" }}>{result.files_to_modify?.length ?? 0}</p>
            </div>
            <div>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>Files to Create</p>
              <p style={{ fontSize: "var(--text-lg)", fontWeight: 900, color: "var(--color-success)" }}>{result.files_to_create?.length ?? 0}</p>
            </div>
            <div>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>Downstream Risks</p>
              <p style={{ fontSize: "var(--text-lg)", fontWeight: 900, color: "var(--color-error)" }}>{result.downstream_risks?.length ?? 0}</p>
            </div>
            <div>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>Complexity</p>
              <p style={{ fontSize: "var(--text-base)", fontWeight: 700, color: COMPLEXITY_COLOR[result.estimated_complexity] || "var(--color-text)", textTransform: "capitalize" }}>
                {result.estimated_complexity?.replace("_", " ")}
              </p>
            </div>
            {result.dependencies_to_add?.length > 0 && (
              <div>
                <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>New Dependencies</p>
                <p style={{ fontSize: "var(--text-xs)", color: "var(--color-primary)" }}>{result.dependencies_to_add.join(", ")}</p>
              </div>
            )}
          </div>

          <FileChangeList title="Files to Modify" files={result.files_to_modify} accent="var(--color-warning)" />
          <FileChangeList title="Files to Create" files={result.files_to_create} accent="var(--color-success)" />

          {result.downstream_risks?.length > 0 && (
            <div style={{ marginBottom: "var(--space-6)" }}>
              <h3 style={{ fontSize: "var(--text-sm)", fontWeight: 700, marginBottom: "var(--space-3)", color: "var(--color-error)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Downstream Risks ({result.downstream_risks.length})
              </h3>
              {result.downstream_risks.map((r, i) => (
                <div key={i} style={{
                  padding: "var(--space-3) var(--space-4)", borderRadius: "var(--radius-md)",
                  background: "var(--color-error-highlight)", border: "1px solid var(--color-error)",
                  marginBottom: "var(--space-2)"
                }}>
                  <code style={{ fontSize: "var(--text-xs)", color: "var(--color-error)", fontFamily: "monospace" }}>{r.file}</code>
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>{r.risk}</p>
                </div>
              ))}
            </div>
          )}

          {result.implementation_order?.length > 0 && (
            <div>
              <h3 style={{ fontSize: "var(--text-sm)", fontWeight: 700, marginBottom: "var(--space-3)", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-muted)" }}>
                Suggested Implementation Order
              </h3>
              <ol style={{ listStyle: "none", padding: 0 }}>
                {result.implementation_order.map((step, i) => (
                  <li key={i} style={{
                    display: "flex", alignItems: "flex-start", gap: "var(--space-3)",
                    padding: "var(--space-2) 0", borderBottom: "1px solid var(--color-divider)"
                  }}>
                    <span style={{
                      minWidth: 24, height: 24, borderRadius: "50%",
                      background: "var(--color-primary-highlight)", color: "var(--color-primary)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "var(--text-xs)", fontWeight: 700
                    }}>{i + 1}</span>
                    <span style={{ fontSize: "var(--text-sm)", paddingTop: "2px" }}>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
