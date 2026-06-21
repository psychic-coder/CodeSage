"use client";
import { useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { projectsAPI, ingestAPI, analysisAPI } from "@/lib/api";
import { JobProgress } from "@/components/shared/JobProgress";
import { GitHubUrlInput } from "@/components/upload/GitHubUrlInput";
import { UploadZone } from "@/components/upload/UploadZone";
import type { Project } from "@/types";
import { useRouter } from "next/navigation";

type Tab = "github" | "zip" | "local";

const LANG_COLORS: Record<string, string> = {
  javascript: "#f1e05a", typescript: "#3178c6", python: "#3572A5",
  java: "#b07219", go: "#00ADD8", rust: "#dea584",
};

function HealthRing({ score, label }: { score: number, label?: string }) {
  const r = 20, circ = 2 * Math.PI * r;
  const color = score >= 70 ? "var(--color-success)" : score >= 40 ? "var(--color-warning)" : "var(--color-error)";
  return (
    <svg width="56" height="56" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="var(--color-surface-offset)" strokeWidth="4"/>
      <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 100)}
        strokeLinecap="round" transform="rotate(-90 28 28)"
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
      <text x="28" y="33" textAnchor="middle" fill={color} fontSize="11" fontWeight="bold">{label ?? score}</text>
    </svg>
  );
}

function ProjectHealthRing({ projectId }: { projectId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["architecture-score", projectId],
    queryFn: () => analysisAPI.architecture(projectId),
    staleTime: Infinity,
    retry: false,
  });

  const score = data?.data?.data?.overall_health_score ?? null;

  if (isLoading) {
    return (
      <div style={{ opacity: 0.4, transition: "opacity 0.5s ease" }}>
        <HealthRing score={0} label="…" />
      </div>
    );
  }

  return <HealthRing score={score ?? 0} label={score === null ? "?" : String(score)} />;
}

export default function DashboardPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<{ data: Project[] }>({ queryKey: ["projects"], queryFn: () => projectsAPI.list() });
  const projects = data?.data || [];

  const [showModal, setShowModal] = useState(false);
  const [tab, setTab] = useState<Tab>("github");
  const [step, setStep] = useState<"create" | "ingest" | "processing">("create");
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [createdProject, setCreatedProject] = useState<Project | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [localPath, setLocalPath] = useState("");

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function handleDeleteProject(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await projectsAPI.delete(id);
      qc.invalidateQueries({ queryKey: ["projects"] });
      setConfirmDeleteId(null);
    } catch (err) {
      console.error("Failed to delete project", err);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCreateProject() {
    if (!newProjectName.trim()) return;
    setFormLoading(true);
    try {
      const sourceMap: Record<Tab, string> = { github: "github", zip: "zip", local: "local" };
      const res = await projectsAPI.create({ name: newProjectName, description: newProjectDesc, source_type: sourceMap[tab] });
      setCreatedProject(res.data);
      setStep("ingest");
    } catch { } finally { setFormLoading(false); }
  }

  async function handleGitHubIngest(url: string, token?: string) {
    if (!createdProject) return;
    setFormLoading(true);
    try {
      const res = await ingestAPI.github(createdProject.id, url, token);
      setJobId(res.data.job_id);
      setStep("processing");
    } catch { } finally { setFormLoading(false); }
  }

  async function handleZipUpload(file: File) {
    if (!createdProject) return;
    setFormLoading(true);
    try {
      const res = await ingestAPI.zip(createdProject.id, file);
      setJobId(res.data.job_id);
      setStep("processing");
    } catch { } finally { setFormLoading(false); }
  }

  async function handleLocalIngest() {
    if (!createdProject || !localPath.trim()) return;
    setFormLoading(true);
    try {
      const res = await ingestAPI.local(createdProject.id, localPath);
      setJobId(res.data.job_id);
      setStep("processing");
    } catch { } finally { setFormLoading(false); }
  }

  function closeModal() {
    setShowModal(false); setStep("create"); setCreatedProject(null);
    setJobId(null); setNewProjectName(""); setNewProjectDesc(""); setLocalPath("");
    qc.invalidateQueries({ queryKey: ["projects"] });
  }

  return (
    <div style={{ padding: "var(--space-8)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-8)", flexWrap: "wrap", gap: "var(--space-4)" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 700 }}>Projects</h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)", marginTop: "var(--space-1)" }}>
            {projects.length} {projects.length === 1 ? "repository" : "repositories"} analyzed
          </p>
        </div>
        <button onClick={() => setShowModal(true)} style={{
          display: "flex", alignItems: "center", gap: "var(--space-2)",
          padding: "var(--space-2) var(--space-4)", borderRadius: "var(--radius-md)",
          background: "var(--color-primary)", color: "#000", fontWeight: 700, fontSize: "var(--text-sm)"
        }}>
          + New Project
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "var(--space-4)" }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: "160px", borderRadius: "var(--radius-lg)" }} />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div style={{ textAlign: "center", padding: "var(--space-20) var(--space-8)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "var(--space-4)" }}>📁</div>
          <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 700, marginBottom: "var(--space-2)" }}>No projects yet</h3>
          <p style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-6)", maxWidth: "40ch", marginInline: "auto" }}>
            Import your first repository to start understanding the impact of every change.
          </p>
          <button onClick={() => setShowModal(true)} style={{
            padding: "var(--space-3) var(--space-6)", borderRadius: "var(--radius-md)",
            background: "var(--color-primary)", color: "#000", fontWeight: 700, fontSize: "var(--text-sm)"
          }}>
            Import Repository
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "var(--space-4)" }}>
          {projects.map(p => (
            <div key={p.id} onClick={() => router.push(`/dashboard/${p.id}`)} style={{ textDecoration: "none" }}>
              <div style={{
                padding: "var(--space-5)", borderRadius: "var(--radius-lg)",
                background: "var(--color-surface)", border: "1px solid var(--color-border)",
                transition: "border-color var(--transition-interactive), box-shadow var(--transition-interactive)",
                cursor: "pointer"
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-primary)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-md)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-border)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-3)" }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: "var(--space-2)" }}>
                    <h3 style={{ fontWeight: 700, fontSize: "var(--text-base)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</h3>
                    {p.description && <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-xs)", marginTop: "var(--space-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.description}</p>}
                  </div>
                  {confirmDeleteId === p.id ? (
                    <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", background: "var(--color-surface-offset)", padding: "4px 8px", borderRadius: "var(--radius-md)" }} onClick={e => e.stopPropagation()}>
                      <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--color-text)" }}>Delete?</span>
                      <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }} style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", padding: "2px 6px", borderRadius: "var(--radius-sm)", background: "var(--color-surface-2)" }} disabled={deletingId === p.id}>Cancel</button>
                      <button onClick={(e) => handleDeleteProject(p.id, e)} style={{ fontSize: "var(--text-xs)", color: "white", padding: "2px 6px", borderRadius: "var(--radius-sm)", background: "var(--color-error)", opacity: deletingId === p.id ? 0.6 : 1 }} disabled={deletingId === p.id}>{deletingId === p.id ? "..." : "Confirm"}</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(p.id); }}
                        style={{ background: "transparent", border: "none", color: "var(--color-text-muted)", cursor: "pointer", fontSize: "1.1rem", padding: "2px", opacity: 0.6, transition: "opacity 0.2s, color 0.2s" }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.color = "var(--color-error)"; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = "0.6"; e.currentTarget.style.color = "var(--color-text-muted)"; }}
                        title="Delete Project"
                      >
                        🗑️
                      </button>
                      {p.status === "ready" && <ProjectHealthRing projectId={p.id} />}
                      {p.status === "processing" && <span style={{ fontSize: "var(--text-xs)", color: "var(--color-warning)", background: "var(--color-warning-highlight)", padding: "2px 8px", borderRadius: "var(--radius-full)" }}>Processing</span>}
                      {p.status === "failed" && <span style={{ fontSize: "var(--text-xs)", color: "var(--color-error)", background: "var(--color-error-highlight)", padding: "2px 8px", borderRadius: "var(--radius-full)" }}>Failed</span>}
                      {p.status === "pending" && <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", background: "var(--color-surface-offset)", padding: "2px 8px", borderRadius: "var(--radius-full)" }}>Pending</span>}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: "var(--space-4)", marginTop: "var(--space-3)", flexWrap: "wrap" }}>
                  {p.primary_language && (
                    <span style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: LANG_COLORS[p.primary_language.toLowerCase()] || "#8d96a0", display: "inline-block" }} />
                      {p.primary_language}
                    </span>
                  )}
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>📄 {p.total_files} files</span>
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>🔗 {p.total_nodes} nodes</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-4)"
        }} onClick={e => e.target === e.currentTarget && closeModal()}>
          <div style={{
            background: "var(--color-surface)", border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-xl)", padding: "var(--space-6)", width: "100%", maxWidth: "480px",
            maxHeight: "90dvh", overflowY: "auto"
          }} className="animate-fadeIn">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-6)" }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-lg)", fontWeight: 700 }}>
                {step === "create" ? "New Project" : step === "ingest" ? "Import Repository" : "Processing..."}
              </h2>
              <button onClick={closeModal} style={{ color: "var(--color-text-muted)", fontSize: "1.2rem" }}>✕</button>
            </div>

            {step === "create" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--color-text-muted)", display: "block", marginBottom: "var(--space-2)" }}>
                    Source
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-2)" }}>
                    {(["github", "zip", "local"] as Tab[]).map(t => (
                      <button key={t} onClick={() => setTab(t)} style={{
                        padding: "var(--space-2)", borderRadius: "var(--radius-md)",
                        border: `1px solid ${tab === t ? "var(--color-primary)" : "var(--color-border)"}`,
                        background: tab === t ? "var(--color-primary-highlight)" : "var(--color-surface-2)",
                        color: tab === t ? "var(--color-primary)" : "var(--color-text-muted)",
                        fontSize: "var(--text-xs)", fontWeight: 600, textTransform: "capitalize"
                      }}>
                        {t === "github" ? "🐙 GitHub" : t === "zip" ? "📦 ZIP" : "💻 Local"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--color-text-muted)", display: "block", marginBottom: "var(--space-2)" }}>
                    Project Name *
                  </label>
                  <input
                    value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
                    placeholder="My Awesome Project"
                    style={{
                      width: "100%", padding: "var(--space-3)", borderRadius: "var(--radius-md)",
                      background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
                      color: "var(--color-text)", fontSize: "var(--text-sm)", outline: "none"
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--color-text-muted)", display: "block", marginBottom: "var(--space-2)" }}>
                    Description (optional)
                  </label>
                  <textarea
                    value={newProjectDesc} onChange={e => setNewProjectDesc(e.target.value)}
                    placeholder="What does this project do?"
                    rows={2}
                    style={{
                      width: "100%", padding: "var(--space-3)", borderRadius: "var(--radius-md)",
                      background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
                      color: "var(--color-text)", fontSize: "var(--text-sm)", outline: "none", resize: "vertical"
                    }}
                  />
                </div>
                <button
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim() || formLoading}
                  style={{
                    padding: "var(--space-3)", borderRadius: "var(--radius-md)",
                    background: "var(--color-primary)", color: "#000", fontWeight: 700,
                    fontSize: "var(--text-sm)", opacity: !newProjectName.trim() ? 0.6 : 1,
                    cursor: !newProjectName.trim() ? "not-allowed" : "pointer"
                  }}
                >
                  {formLoading ? "Creating..." : "Continue →"}
                </button>
              </div>
            )}

            {step === "ingest" && (
              <div>
                {tab === "github" && <GitHubUrlInput onSubmit={handleGitHubIngest} loading={formLoading} />}
                {tab === "zip" && <UploadZone onUpload={handleZipUpload} loading={formLoading} />}
                {tab === "local" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                    <div>
                      <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--color-text-muted)", display: "block", marginBottom: "var(--space-2)" }}>
                        Local Path (Docker volume mount)
                      </label>
                      <input
                        value={localPath} onChange={e => setLocalPath(e.target.value)}
                        placeholder="/mnt/repos/my-project"
                        style={{
                          width: "100%", padding: "var(--space-3)", borderRadius: "var(--radius-md)",
                          background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
                          color: "var(--color-text)", fontSize: "var(--text-sm)", outline: "none", fontFamily: "monospace"
                        }}
                      />
                    </div>
                    <button onClick={handleLocalIngest} disabled={!localPath.trim() || formLoading} style={{
                      padding: "var(--space-3)", borderRadius: "var(--radius-md)",
                      background: "var(--color-primary)", color: "#000", fontWeight: 700,
                      fontSize: "var(--text-sm)", opacity: !localPath.trim() ? 0.6 : 1
                    }}>
                      {formLoading ? "Starting..." : "Analyze Path"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {step === "processing" && jobId && (
              <div>
                <JobProgress
                  jobId={jobId}
                  onComplete={() => { setTimeout(closeModal, 1500); }}
                  onError={(msg) => console.error(msg)}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
