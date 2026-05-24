"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { analysisAPI } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

function RiskBadge({ severity }: { severity: string }) {
  const color = severity === "critical" || severity === "high"
    ? "var(--color-error)"
    : severity === "medium"
      ? "var(--color-warning)"
      : "var(--color-success)";
  return <Badge style={{ background: `${color}1a`, color }}>{severity}</Badge>;
}

export default function ImprovementsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [category, setCategory] = useState("");

  const improvementsQuery = useQuery({
    queryKey: ["improvements", projectId, category],
    queryFn: () => analysisAPI.improvements(projectId, category || undefined),
  });
  const recommendationsQuery = useQuery({
    queryKey: ["recommendations", projectId],
    queryFn: () => analysisAPI.recommendations(projectId),
  });

  const improvements = useMemo(() => {
    const data = improvementsQuery.data?.data?.data ?? improvementsQuery.data?.data ?? [];
    return Array.isArray(data) ? data : data.improvements ?? data.items ?? [];
  }, [improvementsQuery.data]);

  const recommendations = useMemo(() => {
    const data = recommendationsQuery.data?.data?.data ?? recommendationsQuery.data?.data ?? [];
    return Array.isArray(data) ? data : data.recommendations ?? data.items ?? [];
  }, [recommendationsQuery.data]);

  return (
    <div style={{ padding: "var(--space-8)", maxWidth: 1200 }}>
      <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-6)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
        <Link href="/dashboard">Projects</Link>
        <span>/</span>
        <Link href={`/dashboard/${projectId}`}>Overview</Link>
        <span>/</span>
        <span>Improvements</span>
      </div>

      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 700, marginBottom: "var(--space-2)" }}>Improvement Suggestions</h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-6)" }}>Prioritized security, performance, and refactoring opportunities.</p>

      <div className="panel pad" style={{ marginBottom: "var(--space-6)", display: "flex", gap: "var(--space-3)", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>Filter</span>
        {[
          "", "performance", "security", "refactoring",
        ].map((item) => (
          <button
            key={item || "all"}
            onClick={() => setCategory(item)}
            style={{
              padding: "2px 10px",
              borderRadius: "var(--radius-full)",
              border: `1px solid ${category === item ? "var(--color-primary)" : "var(--color-border)"}`,
              background: category === item ? "var(--color-primary-highlight)" : "transparent",
              color: category === item ? "var(--color-primary)" : "var(--color-text-muted)",
              fontSize: "var(--text-xs)",
            }}
          >
            {item || "all"}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "var(--space-4)" }}>
        <section className="panel pad">
          <h2 style={{ marginBottom: "var(--space-4)" }}>Improvement items</h2>
          {improvementsQuery.isLoading ? <div className="skeleton" style={{ height: 140 }} /> : improvements.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {improvements.map((item: any, index: number) => (
                <article key={item.id ?? `${item.file}-${index}`} className="panel pad">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap" }}>
                    <h3>{item.title ?? item.name ?? "Untitled improvement"}</h3>
                    <RiskBadge severity={item.severity ?? "low"} />
                  </div>
                  <p style={{ marginTop: "var(--space-2)", color: "var(--color-text-muted)" }}>{item.explanation ?? item.description ?? "No details provided."}</p>
                  <div style={{ marginTop: "var(--space-2)", display: "flex", gap: "var(--space-2)", flexWrap: "wrap", fontSize: "var(--text-xs)" }}>
                    {item.category && <Badge>{item.category}</Badge>}
                    {item.file && <span>{item.file}</span>}
                    {item.effort && <span>Effort: {item.effort}</span>}
                  </div>
                  {item.suggested_fix && <p style={{ marginTop: "var(--space-2)", color: "var(--color-primary)" }}>{item.suggested_fix}</p>}
                </article>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--color-text-muted)" }}>No improvement suggestions were returned.</p>
          )}
        </section>

        <section className="panel pad">
          <h2 style={{ marginBottom: "var(--space-4)" }}>Recommended features</h2>
          {recommendationsQuery.isLoading ? <div className="skeleton" style={{ height: 140 }} /> : recommendations.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {recommendations.map((item: any, index: number) => (
                <article key={item.feature ?? `${index}`} className="panel pad">
                  <h3>{item.feature ?? item.title ?? "Feature idea"}</h3>
                  <p style={{ marginTop: "var(--space-2)", color: "var(--color-text-muted)" }}>{item.rationale ?? item.description ?? "No rationale provided."}</p>
                  <p style={{ marginTop: "var(--space-2)", fontSize: "var(--text-xs)" }}>Complexity: {item.complexity ?? "unknown"}</p>
                </article>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--color-text-muted)" }}>No recommendations were returned.</p>
          )}
        </section>
      </div>
    </div>
  );
}
