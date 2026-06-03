"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import {
  CalendarClock,
  Eye,
  GitBranch,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { GitHubUrlInput } from "@/components/upload/GitHubUrlInput";
import { UploadZone } from "@/components/upload/UploadZone";
import { JobProgress } from "@/components/shared/JobProgress";
import { ingestAPI, projectsAPI } from "@/lib/api";
import {
  formatProjectTime,
  getProjectHealth,
  getProjectSegments,
  projectAccent,
} from "@/lib/dashboard-ui";
import { cn } from "@/lib/utils";
import type { Project } from "@/types";

type Tab = "github" | "zip";

function HealthRing({ score }: { score: number }) {
  const size = 68;
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const color = score >= 84 ? "#34D399" : score >= 68 ? "#22D3EE" : score >= 52 ? "#F59E0B" : "#FB7185";

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-[68px] w-[68px]">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - score / 100)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.16,1,0.3,1)" }}
      />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="fill-white text-[14px] font-semibold">
        {score}
      </text>
    </svg>
  );
}

function ProjectCard({ project, index, onDelete }: { project: Project; index: number; onDelete: (id: string) => void }) {
  const score = getProjectHealth(project);
  const segments = getProjectSegments(project);
  const accent = projectAccent(project);

  return (
    <div
      className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.25)] transition duration-300 hover:-translate-y-1 hover:border-cyan-400/30 hover:bg-white/[0.06]"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.2),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(167,139,250,0.16),transparent_30%)]" />
      </div>
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-white/35">
            <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
            {project.source_type}
          </div>
          <h3 className="mt-2 truncate text-xl font-semibold text-white">{project.name}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-white/45">{project.description || "Multi-package repository with production telemetry, auth, and data flows."}</p>
        </div>
        <div className="shrink-0 rounded-2xl border border-white/10 bg-black/30 p-2">
          <HealthRing score={score} />
        </div>
      </div>

      <div className="relative mt-5 space-y-3">
        <div className="flex items-center justify-between text-xs text-white/45">
          <span>Language breakdown</span>
          <span>Health {score}%</span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full bg-white/5">
          {segments.map((segment) => (
            <div key={segment.name} className="h-full transition-all duration-300 group-hover:brightness-125" style={{ width: `${segment.percentage}%`, background: segment.color }} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-white/50">
          {segments.map((segment) => (
            <span key={segment.name} className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1">
              {segment.name} {segment.percentage}%
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/10 pt-4 text-sm text-white/50">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-cyan-300" />
          <span>Last analyzed {formatProjectTime(project.updated_at)}</span>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs" style={{ color: accent }}>
          <GitBranch className="h-3.5 w-3.5" />
          ready
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-5 bottom-5 flex translate-y-4 items-center justify-end gap-2 opacity-0 transition-all duration-300 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
        <button
          type="button"
          onClick={() => onDelete(project.id)}
          className="pointer-events-auto inline-flex h-10 items-center gap-2 rounded-full border border-rose-400/30 bg-rose-500/10 px-4 text-xs font-medium text-rose-200 transition hover:bg-rose-500/20"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
        <Link href={`/dashboard/${project.id}`} className="pointer-events-auto inline-flex h-10 items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 text-xs font-medium text-cyan-100 transition hover:bg-cyan-400/20">
          <Eye className="h-3.5 w-3.5" />
          View
        </Link>
      </div>
    </div>
  );
}

export function DashboardProjectsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["projects"], queryFn: () => projectsAPI.list() });
  const projects = (data?.data ?? []) as Project[];

  const [createTab, setCreateTab] = useState<Tab>("github");
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [createdProject, setCreatedProject] = useState<Project | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [githubUrl, setGithubUrl] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const showCreateForm = projects.length === 0 || isCreating;

  async function createProjectRecord(sourceType: Tab) {
    const response = await projectsAPI.create({
      name: projectName.trim() || "New Project",
      description: projectDescription.trim() || undefined,
      source_type: sourceType,
    });
    setCreatedProject(response.data);
    return response.data;
  }

  async function handleGithubImport(url: string, token?: string) {
    setLoading(true);
    try {
      const project = await createProjectRecord("github");
      const ingest = await ingestAPI.github(project.id, url, token);
      setJobId(ingest.data.job_id);
    } finally {
      setLoading(false);
    }
  }

  async function handleZipImport(file: File) {
    setLoading(true);
    try {
      const project = createdProject || (await createProjectRecord("zip"));
      const ingest = await ingestAPI.zip(project.id, file);
      setJobId(ingest.data.job_id);
    } finally {
      setLoading(false);
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/zip": [".zip"], "application/gzip": [".tar.gz", ".tgz"] },
    maxFiles: 1,
    disabled: loading,
    onDrop: async (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (!file) return;
      await handleZipImport(file);
    },
  });

  async function deleteProject(id: string) {
    const confirmed = window.confirm("Delete this project? This cannot be undone.");
    if (!confirmed) return;
    await projectsAPI.delete(id);
    qc.invalidateQueries({ queryKey: ["projects"] });
  }

  const headline = useMemo(() => {
    if (isLoading) return "Loading projects";
    if (projects.length === 0) return "Import your first codebase";
    return `${projects.length} projects, all visible in one control plane`;
  }, [isLoading, projects.length]);

  return (
    <div className="relative min-h-full px-5 py-6 lg:px-8">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.10),transparent_26%)]" />
      <div className="relative mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-white/35">Dashboard / Projects</div>
            <h1 className="mt-2 text-3xl font-semibold text-white md:text-4xl">Project Selection</h1>
            <p className="mt-3 max-w-2xl text-sm text-white/55">{headline}</p>
          </div>
          {!showCreateForm && (
            <button onClick={() => setIsCreating(true)} className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/20">
              <Plus className="h-4 w-4" /> New Project
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-[238px] rounded-[28px] border border-white/10 bg-white/[0.04]" />
            ))}
          </div>
        ) : (
          <div className="space-y-12">
            {projects.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {projects.map((project, index) => (
                  <ProjectCard key={project.id} project={project} index={index} onDelete={deleteProject} />
                ))}

                {!showCreateForm && (
                  <button onClick={() => {
                    setIsCreating(true);
                    setTimeout(() => document.getElementById("new-project-card")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
                  }} className="group rounded-[28px] border border-dashed border-white/12 bg-white/[0.03] p-5 text-left transition hover:border-cyan-400/30 hover:bg-cyan-400/5">
                    <div className="flex h-full min-h-[238px] flex-col justify-between rounded-[24px] border border-white/5 bg-[linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-5 transition group-hover:border-cyan-400/20">
                      <div>
                        <div className="text-sm uppercase tracking-[0.28em] text-white/35">New Project</div>
                        <h3 className="mt-3 text-2xl font-semibold text-white">Drop a repository here</h3>
                        <p className="mt-3 text-sm text-white/55">Paste a GitHub URL, drag a ZIP, or create a project record and attach a source later.</p>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-3 text-xs text-white/45">
                        <span>Glass dropzone</span>
                        <Plus className="h-4 w-4 text-cyan-200" />
                      </div>
                    </div>
                  </button>
                )}
              </div>
            )}

            {showCreateForm && (
              <div id="new-project-card" className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr] scroll-mt-8">
                <div className="rounded-[32px] border border-dashed border-cyan-400/30 bg-white/[0.04] p-8 shadow-[0_16px_80px_rgba(34,211,238,0.12)]">
              <div className="flex items-center gap-3 text-cyan-100">
                <Upload className="h-5 w-5" />
                <span className="text-sm uppercase tracking-[0.24em]">New Project</span>
              </div>
              <h2 className="mt-4 text-2xl font-semibold text-white">Drop a GitHub URL or ZIP archive</h2>
              <p className="mt-3 max-w-xl text-sm text-white/55">The card itself acts as a glassy dropzone. You can paste a repository URL, drag a ZIP, or create a blank project and ingest it later.</p>
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                <input value={githubUrl} onChange={(event) => setGithubUrl(event.target.value)} placeholder="https://github.com/org/repo" className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-400/30" />
                <label className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/60">
                  <span className="flex items-center justify-between gap-3">
                    <span>{githubToken ? "Token added" : "Private repo token"}</span>
                    <button type="button" onClick={() => setShowToken((value) => !value)} className="text-xs text-cyan-200">{showToken ? "Hide" : "Reveal"}</button>
                  </span>
                  {showToken && (
                    <input value={githubToken} onChange={(event) => setGithubToken(event.target.value)} placeholder="ghp_..." className="mt-3 w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30" />
                  )}
                </label>
              </div>
              <div
                {...getRootProps()}
                className={cn(
                  "mt-4 rounded-[28px] border border-dashed p-8 text-center transition",
                  isDragActive ? "border-cyan-400 bg-cyan-400/10" : "border-white/10 bg-black/20"
                )}
              >
                <input {...getInputProps()} />
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                  <Upload className="h-5 w-5 text-cyan-200" />
                </div>
                <p className="mt-3 text-sm text-white/75">{isDragActive ? "Release to upload the ZIP" : "Drag and drop a ZIP, or click this area to browse"}</p>
                <p className="mt-1 text-xs text-white/40">The border spins with a subtle gradient as you hover the card.</p>
              </div>
              <button onClick={async () => { 
                if (!projectName.trim()) return; 
                if (githubUrl.trim()) {
                  await handleGithubImport(githubUrl.trim(), githubToken.trim());
                } else {
                  await createProjectRecord("github");
                }
              }} disabled={!projectName.trim() || loading} className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-cyan-100 disabled:opacity-40">
                {loading ? "Processing..." : (githubUrl.trim() ? "Create & Import" : "Create Empty Project")}
              </button>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-8">
              <div className="text-sm uppercase tracking-[0.28em] text-white/35">Project meta</div>
              <div className="mt-4 space-y-4">
                <input value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Acme Platform" className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30" />
                <textarea value={projectDescription} onChange={(event) => setProjectDescription(event.target.value)} rows={4} placeholder="Next.js frontends, Python workers, Postgres, Neo4j, and realtime tooling." className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30" />
                <div className="flex items-center justify-between gap-4 mt-4">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-xs text-white/45 flex-1">Use the create flow to seed the backend project record, then ingest from GitHub or ZIP.</div>
                  {projects.length > 0 && (
                    <button type="button" onClick={() => setIsCreating(false)} className="rounded-full border border-white/10 bg-black/20 px-6 py-3 text-xs uppercase tracking-[0.24em] text-white/45 transition hover:bg-white/5 hover:text-white shrink-0">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
            </div>
            )}
          </div>
        )}

        {jobId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-xl">
            <div className="w-full max-w-lg rounded-[32px] border border-white/10 bg-[#0d0f14]/95 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.65)]">
              <div className="text-sm uppercase tracking-[0.28em] text-white/35">Processing</div>
              <h3 className="mt-2 text-2xl font-semibold text-white">Analyzing repository</h3>
              <JobProgress jobId={jobId} onComplete={() => qc.invalidateQueries({ queryKey: ["projects"] })} onError={() => undefined} />
              <div className="mt-4 flex justify-end">
                <button onClick={() => setJobId(null)} className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/60">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
