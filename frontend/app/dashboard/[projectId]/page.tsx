"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { projectsAPI, graphAPI } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type { Project } from "@/types";

const ACTION_CARDS = [
  { href: "impact", icon: "⚡", title: "Impact Predictor", desc: "Describe a feature and see every file that needs to change", color: "var(--color-primary)" },
  { href: "graph", icon: "🔗", title: "Dependency Graph", desc: "Visualize your entire codebase as an interactive dependency map", color: "var(--color-purple)" },
  { href: "architecture", icon: "🏗️", title: "Architecture Analysis", desc: "Detect circular deps, god files, and coupling issues", color: "var(--color-warning)" },
  { href: "improvements", icon: "💡", title: "Improvements", desc: "Security vulnerabilities, performance issues, refactoring opportunities", color: "var(--color-success)" },
  { href: "onboarding", icon: "🚀", title: "Onboarding Guide", desc: "Ask any question about the codebase in natural language", color: "var(--color-orange)" },
];

export default function ProjectOverviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { setCurrentProject } = useAppStore();
  const qc = useQueryClient();

  const { data: projectData, isLoading } = useQuery<{ data: Project }>({
    queryKey: ["project", projectId],
    queryFn: () => projectsAPI.get(projectId),
  });

  const { data: statsData } = useQuery({
    queryKey: ["graph-stats", projectId],
    queryFn: () => graphAPI.stats(projectId),
    enabled: projectData?.data?.status === "ready",
  });

  const project = projectData?.data;
  const stats = statsData?.data;

  useEffect(() => { if (project) setCurrentProject(project); }, [project, setCurrentProject]);

  async function handleReanalyze() {
    await projectsAPI.reanalyze(projectId);
    qc.invalidateQueries({ queryKey: ["project", projectId] });
  }

  if (isLoading) {
    return (
      <div style={{ padding: "var(--space-8)" }}>
        <div className="skeleton" style={{ height: "60px", width: "300px", marginBottom: "var(--space-4)" }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "var(--space-4)", marginBottom: "var(--space-8)" }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: "80px" }} />)}
        </div>
      </div>
    );
  }

  if (!project) return <div style={{ padding: "var(--space-8)", color: "var(--color-error)" }}>Project not found.</div>;

  const statusColor = project.status === "ready" ? "var(--color-success)" : project.status === "failed" ? "var(--color-error)" : "var(--color-warning)";

  return (
    <div style={{ padding: "var(--space-8)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-6)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
        <Link href="/dashboard" style={{ color: "var(--color-text-muted)", textDecoration: "none" }}>Projects</Link>
        <span>/</span>
        <span style={{ color: "var(--color-text)" }}>{project.name}</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-8)", flexWrap: "wrap", gap: "var(--space-4)" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 700 }}>{project.name}</h1>
            <span style={{
              fontSize: "var(--text-xs)", fontWeight: 600, padding: "2px 8px", borderRadius: "var(--radius-full)",
              background: `${statusColor}1a`, color: statusColor, textTransform: "capitalize"
            }}>{project.status}</span>
          </div>
          {project.description && <p style={{ color: "var(--color-text-muted)", marginTop: "var(--space-2)", fontSize: "var(--text-sm)" }}>{project.description}</p>}
          {project.source_url && (
            <a href={project.source_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "var(--text-xs)", color: "var(--color-primary)", marginTop: "var(--space-1)", display: "inline-block" }}>
              {project.source_url}
            </a>
          )}
        </div>
        <button onClick={handleReanalyze} style={{
          padding: "var(--space-2) var(--space-4)", borderRadius: "var(--radius-md)",
          border: "1px solid var(--color-border)", color: "var(--color-text-muted)",
          fontSize: "var(--text-sm)", background: "none"
        }}>
          ↺ Re-analyze
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: "var(--space-3)", marginBottom: "var(--space-8)" }}>
        {[
          { label: "Total Files", value: project.total_files },
          { label: "Graph Nodes", value: stats?.node_count ?? project.total_nodes },
          { label: "Edges", value: stats?.edge_count ?? project.total_edges },
          { label: "Language", value: project.primary_language || "—" },
        ].map(s => (
          <div key={s.label} style={{
            padding: "var(--space-4)", borderRadius: "var(--radius-lg)",
            background: "var(--color-surface)", border: "1px solid var(--color-border)", textAlign: "center"
          }}>
            <p style={{ fontSize: "var(--text-lg)", fontWeight: 900, fontFamily: "var(--font-display)", fontVariantNumeric: "tabular-nums" }}>{s.value}</p>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {stats?.top_files?.length > 0 && (
        <div style={{ marginBottom: "var(--space-8)" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-base)", fontWeight: 700, marginBottom: "var(--space-4)" }}>
            Most Connected Files
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {stats.top_files.slice(0, 5).map((f: any) => (
              <div key={f.path} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "var(--space-3) var(--space-4)", borderRadius: "var(--radius-md)",
                background: "var(--color-surface)", border: "1px solid var(--color-border)"
              }}>
                <code style={{ fontSize: "var(--text-xs)", color: "var(--color-text)", fontFamily: "monospace" }}>{f.path}</code>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", fontVariantNumeric: "tabular-nums" }}>{f.in_degree} dependents</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-base)", fontWeight: 700, marginBottom: "var(--space-4)" }}>
        Intelligence Tools
      </h2>
      {project.status !== "ready" ? (
        <div style={{ padding: "var(--space-8)", textAlign: "center", background: "var(--color-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)" }}>
          <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>
            Intelligence tools are available once the repository has finished processing.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px,1fr))", gap: "var(--space-4)" }}>
          {ACTION_CARDS.map(card => (
            <Link key={card.href} href={`/dashboard/${projectId}/${card.href}`} style={{ textDecoration: "none" }}>
              <div style={{
                padding: "var(--space-5)", borderRadius: "var(--radius-lg)",
                background: "var(--color-surface)", border: "1px solid var(--color-border)",
                transition: "all var(--transition-interactive)", cursor: "pointer"
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = card.color; (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-md)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-border)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
              >
                <div style={{ fontSize: "1.5rem", marginBottom: "var(--space-3)" }}>{card.icon}</div>
                <h3 style={{ fontWeight: 700, fontSize: "var(--text-sm)", marginBottom: "var(--space-2)", color: card.color }}>{card.title}</h3>
                <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-xs)", lineHeight: 1.6 }}>{card.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
