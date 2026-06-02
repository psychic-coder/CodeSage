"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, GitBranch, Layers3, RefreshCw, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { graphAPI, projectsAPI } from "@/lib/api";
import { JobProgress } from "@/components/shared/JobProgress";
import { getProjectHealth, getProjectSegments, projectAccent, unwrapAnalysis } from "@/lib/dashboard-ui";
import type { Project } from "@/types";

const ACTIONS = [
  { href: "graph", icon: GitBranch, title: "Dependency Graph", description: "Explore direct and transitive relationships across the repository." },
  { href: "architecture", icon: Layers3, title: "Architecture", description: "Inspect cycles, coupling, god files, and external dependencies." },
  { href: "improvements", icon: ShieldCheck, title: "Improvements", description: "Review security, refactoring, and performance suggestions." },
  { href: "impact", icon: Zap, title: "Impact Analysis", description: "Predict what changes when a feature request lands." },
  { href: "onboarding", icon: Sparkles, title: "Onboarding", description: "Generate a guided reading order for a new contributor." },
];

function HealthRing({ score }: { score: number }) {
  const size = 152;
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const color = score >= 84 ? "#34D399" : score >= 68 ? "#22D3EE" : score >= 52 ? "#F59E0B" : "#FB7185";

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-[152px] w-[152px]">
      <defs>
        <linearGradient id="health-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22D3EE" />
          <stop offset="50%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#34D399" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="url(#health-ring-gradient)"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - score / 100)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 1100ms cubic-bezier(0.16,1,0.3,1)" }}
      />
      <text x="50%" y="46%" dominantBaseline="middle" textAnchor="middle" className="fill-white text-[30px] font-semibold">{score}</text>
      <text x="50%" y="62%" dominantBaseline="middle" textAnchor="middle" className="fill-white/45 text-[10px] uppercase tracking-[0.32em]">Health</text>
    </svg>
  );
}

export function ProjectOverviewPage({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [animatedScore, setAnimatedScore] = useState(0);
  const [reanalyzeJobId, setReanalyzeJobId] = useState<string | null>(null);

  const projectQuery = useQuery({ queryKey: ["project", projectId], queryFn: () => projectsAPI.get(projectId) });
  const statsQuery = useQuery({ queryKey: ["graph-stats", projectId], queryFn: () => graphAPI.stats(projectId), enabled: Boolean(projectQuery.data?.data) });

  const project = projectQuery.data?.data as Project | undefined;
  const stats = unwrapAnalysis<{ node_count?: number; edge_count?: number; top_files?: { path: string; in_degree: number }[] }>(statsQuery.data);
  const score = project ? getProjectHealth(project) : 0;
  const accent = project ? projectAccent(project) : "#22D3EE";
  const segments = project ? getProjectSegments(project) : [];

  useEffect(() => {
    const target = score;
    let frame = 0;
    const duration = 800;
    const start = performance.now();
    const tick = (time: number) => {
      const progress = Math.min(1, (time - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * target));
      frame = requestAnimationFrame(tick);
      if (progress >= 1) cancelAnimationFrame(frame);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  async function handleReanalyze() {
    const response = await projectsAPI.reanalyze(projectId);
    setReanalyzeJobId(response.data.job_id);
  }

  if (projectQuery.isLoading) {
    return <div className="px-6 py-6 lg:px-8"><div className="h-[220px] rounded-[32px] border border-white/10 bg-white/[0.04]" /></div>;
  }

  if (!project) {
    return <div className="px-6 py-10 text-sm text-rose-200">Project not found.</div>;
  }

  return (
    <div className="px-5 py-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_90px_rgba(0,0,0,0.25)] lg:p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-6">
              <HealthRing score={animatedScore} />
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-white/35">Architecture summary</div>
                <h1 className="mt-2 text-3xl font-semibold text-white">{project.name}</h1>
                <p className="mt-3 max-w-2xl text-sm text-white/55">{project.description || "A hybrid Next.js and Python codebase with API routes, workers, graph analytics, and UI modules."}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/50">
                  <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1">Pattern: {project.source_type === "github" ? "Monorepo" : "Multi-stage pipeline"}</span>
                  <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1">Scalability: {score >= 80 ? "Strong" : score >= 60 ? "Balanced" : "Needs attention"}</span>
                  <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1">Accent: <span style={{ color: accent }}>{project.primary_language || "TypeScript"}</span></span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button onClick={handleReanalyze} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm text-white/75 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-white">
                <RefreshCw className="h-4 w-4" /> Re-analyze
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            {[
              { label: "Files", value: project.total_files },
              { label: "Nodes", value: stats?.node_count ?? project.total_nodes },
              { label: "Edges", value: stats?.edge_count ?? project.total_edges },
              { label: "Health", value: `${score}%` },
            ].map((item) => (
              <div key={item.label} className="rounded-3xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-[0.24em] text-white/35">{item.label}</div>
                <div className="mt-3 text-2xl font-semibold text-white">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.28em] text-white/35">
              <span>Language breakdown</span>
              <span>Updated {project.updated_at}</span>
            </div>
            <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-white/5">
              {segments.map((segment) => (
                <div key={segment.name} className="h-full" style={{ width: `${segment.percentage}%`, background: segment.color }} />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/45">
              {segments.map((segment) => (
                <span key={segment.name} className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1">{segment.name} {segment.percentage}%</span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={`/dashboard/${projectId}/${action.href}`} className="group rounded-[28px] border border-white/10 bg-white/[0.04] p-5 transition hover:-translate-y-1 hover:border-cyan-400/30 hover:bg-white/[0.06]">
                <Icon className="h-5 w-5 text-cyan-200" />
                <h2 className="mt-4 text-xl font-semibold text-white">{action.title}</h2>
                <p className="mt-2 text-sm text-white/55">{action.description}</p>
              </Link>
            );
          })}
        </div>

        {stats?.top_files?.length ? (
          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 lg:p-8">
            <div className="text-sm uppercase tracking-[0.28em] text-white/35">Most connected files</div>
            <div className="mt-5 space-y-3">
              {stats.top_files.slice(0, 6).map((item) => (
                <div key={item.path} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <code className="max-w-[72%] truncate text-sm text-cyan-100">{item.path}</code>
                  <span className="text-xs text-white/45">{item.in_degree} dependents</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {reanalyzeJobId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-xl">
          <div className="w-full max-w-lg rounded-[32px] border border-white/10 bg-[#0d0f14]/95 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.65)]">
            <div className="text-sm uppercase tracking-[0.28em] text-white/35">Re-analysis</div>
            <h2 className="mt-2 text-2xl font-semibold text-white">Processing the repository again</h2>
            <JobProgress jobId={reanalyzeJobId} onComplete={() => qc.invalidateQueries({ queryKey: ["project", projectId] })} onError={() => undefined} />
            <div className="mt-4 flex justify-end">
              <button onClick={() => setReanalyzeJobId(null)} className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/60">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
