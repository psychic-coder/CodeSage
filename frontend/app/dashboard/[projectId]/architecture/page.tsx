"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { analysisAPI } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

function SeverityPill({ value }: { value: string }) {
  const colors: Record<string, string> = {
    critical: "var(--color-error)",
    high: "var(--color-error)",
    medium: "var(--color-warning)",
    low: "var(--color-success)",
  };
  const color = colors[value] || "var(--color-text-muted)";
  return <Badge style={{ background: `${color}1a`, color }}>{value}</Badge>;
}

export default function ArchitecturePage() {
  const { projectId } = useParams<{ projectId: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["architecture", projectId],
    queryFn: () => analysisAPI.architecture(projectId),
  });

  const result = useMemo(() => data?.data?.data ?? data?.data ?? null, [data]);
  const findings = result?.findings ?? {};
  const issues = Array.isArray(result?.issues) ? result.issues : [];
  const strengths = Array.isArray(result?.strengths) ? result.strengths : [];

  if (isLoading) {
    return <div style={{ padding: "var(--space-8)" }}><div className="skeleton" style={{ height: 220, borderRadius: "var(--radius-xl)" }} /></div>;
  }

  if (error) {
    return <div style={{ padding: "var(--space-8)", color: "var(--color-error)" }}>Unable to load architecture analysis.</div>;
  }

  return (
    <div style={{ padding: "var(--space-8)", maxWidth: 1200 }}>
      <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-6)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
        <Link href="/dashboard">Projects</Link>
        <span>/</span>
        <Link href={`/dashboard/${projectId}`}>Overview</Link>
        <span>/</span>
        <span>Architecture</span>
      </div>

      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 700, marginBottom: "var(--space-2)" }}>Architecture Analysis</h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-8)" }}>A structured summary of coupling, cycles, and system health.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        <div className="panel pad">
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>Health score</p>
          <p style={{ fontSize: "var(--text-xl)", fontWeight: 800 }}>{result?.overall_health_score ?? "—"}</p>
          <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>{result?.health_label ?? "No label"}</p>
        </div>
        <div className="panel pad">
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>Pattern</p>
          <p style={{ fontSize: "var(--text-base)", fontWeight: 700 }}>{result?.architecture_pattern ?? "Unknown"}</p>
        </div>
        <div className="panel pad">
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>Scalability</p>
          <p style={{ fontSize: "var(--text-sm)" }}>{result?.scalability_assessment ?? "No assessment yet."}</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "var(--space-4)" }}>
        <div className="panel pad">
          <h2 style={{ marginBottom: "var(--space-4)" }}>Strengths</h2>
          {strengths.length ? (
            <ul style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", paddingLeft: "var(--space-5)" }}>
              {strengths.map((item: string) => <li key={item}>{item}</li>)}
            </ul>
          ) : <p style={{ color: "var(--color-text-muted)" }}>No strengths were returned.</p>}
        </div>

        <div className="panel pad">
          <h2 style={{ marginBottom: "var(--space-4)" }}>Findings</h2>
          <div style={{ display: "grid", gap: "var(--space-3)" }}>
            <div><strong>Circular deps:</strong> {findings.circular_deps?.length ?? 0}</div>
            <div><strong>God files:</strong> {findings.god_files?.length ?? 0}</div>
            <div><strong>Tight couplings:</strong> {findings.tight_coupling?.length ?? 0}</div>
            <div><strong>Isolated files:</strong> {findings.isolated_files?.length ?? 0}</div>
            <div><strong>External deps:</strong> {findings.external_deps?.length ?? 0}</div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "var(--space-6)" }}>
        <h2 style={{ marginBottom: "var(--space-4)" }}>Issues</h2>
        {issues.length ? (
          <div style={{ display: "grid", gap: "var(--space-3)" }}>
            {issues.map((issue: any, index: number) => (
              <div key={`${issue.title || index}`} className="panel pad">
                <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap" }}>
                  <h3>{issue.title ?? "Issue"}</h3>
                  <SeverityPill value={issue.severity ?? "low"} />
                </div>
                <p style={{ color: "var(--color-text-muted)", marginTop: "var(--space-2)" }}>{issue.description ?? issue.summary ?? "No description provided."}</p>
                {issue.involved_files?.length ? <p style={{ marginTop: "var(--space-2)", fontSize: "var(--text-xs)" }}>Files: {issue.involved_files.join(", ")}</p> : null}
                {issue.suggested_fix && <p style={{ marginTop: "var(--space-2)", color: "var(--color-primary)" }}>{issue.suggested_fix}</p>}
              </div>
            ))}
          </div>
        ) : (
          <div className="panel pad">No architecture issues were returned.</div>
        )}
      </div>
    </div>
  );
}
