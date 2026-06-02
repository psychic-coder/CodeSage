"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, ChevronDown, Code2, Layers3, Link2, ShieldAlert } from "lucide-react";
import { analysisAPI } from "@/lib/api";
import { architectureFallback, normalizeList, unwrapAnalysis } from "@/lib/dashboard-ui";

type TabKey = "issues" | "god-files" | "cycles" | "coupling" | "external";

function SeverityPill({ severity }: { severity: string }) {
  const palette: Record<string, string> = {
    critical: "border-rose-400/30 bg-rose-500/10 text-rose-200",
    high: "border-orange-400/30 bg-orange-500/10 text-orange-200",
    medium: "border-amber-400/30 bg-amber-500/10 text-amber-100",
    low: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
  };
  return <span className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.22em] ${palette[severity] || palette.low}`}>{severity}</span>;
}

function AnimatedRing({ score }: { score: number }) {
  const size = 180;
  const radius = 66;
  const circumference = 2 * Math.PI * radius;
  const color = score >= 84 ? "#34D399" : score >= 68 ? "#22D3EE" : score >= 52 ? "#F59E0B" : "#FB7185";

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-[180px] w-[180px] drop-shadow-[0_0_35px_rgba(34,211,238,0.12)]">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - score / 100)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 1100ms cubic-bezier(0.16,1,0.3,1)" }}
      />
      <text x="50%" y="48%" dominantBaseline="middle" textAnchor="middle" className="fill-white text-[34px] font-semibold">
        {score}
      </text>
      <text x="50%" y="63%" dominantBaseline="middle" textAnchor="middle" className="fill-white/40 text-[11px] uppercase tracking-[0.3em]">
        Health
      </text>
    </svg>
  );
}

export function ArchitecturePage({ projectId }: { projectId: string }) {
  const query = useQuery({ queryKey: ["architecture", projectId], queryFn: () => analysisAPI.architecture(projectId) });
  const raw = unwrapAnalysis<any>(query.data);
  const result = raw?.data || raw || architectureFallback;
  const findings = result?.findings || architectureFallback.findings;
  const issues = normalizeList(result?.issues, architectureFallback.issues);
  const strengths = normalizeList(result?.strengths, architectureFallback.strengths);

  const [activeTab, setActiveTab] = useState<TabKey>("issues");
  const [openIssue, setOpenIssue] = useState<number | null>(0);
  const [animatedScore, setAnimatedScore] = useState(0);

  const score = Math.round(Number(result?.overall_health_score ?? architectureFallback.overall_health_score));

  useEffect(() => {
    const start = performance.now();
    const duration = 900;
    let frame = 0;
    const tick = (time: number) => {
      const progress = Math.min(1, (time - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(score * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  const godFiles = normalizeList<any>(findings?.god_files, architectureFallback.findings.god_files);
  const cycle = normalizeList<string>(findings?.circular_deps?.[0], architectureFallback.findings.circular_deps[0]);
  const coupling = normalizeList<any>(findings?.tight_coupling, architectureFallback.findings.tight_coupling);
  const external = normalizeList<any>(findings?.external_deps, architectureFallback.findings.external_deps);

  if (query.isLoading) {
    return <div className="px-5 py-6 lg:px-8"><div className="h-[280px] rounded-[32px] border border-white/10 bg-white/[0.04]" /></div>;
  }

  return (
    <div className="px-5 py-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 lg:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-6">
              <AnimatedRing score={animatedScore} />
              <div>
                <div className="text-xs uppercase tracking-[0.28em] text-white/35">Architecture pattern</div>
                <h1 className="mt-2 text-3xl font-semibold text-white">{result?.architecture_pattern || architectureFallback.architecture_pattern}</h1>
                <p className="mt-3 max-w-2xl text-sm text-white/55">{result?.scalability_assessment || architectureFallback.scalability_assessment}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/50">
                  <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1">{result?.health_label || architectureFallback.health_label}</span>
                  <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1">{issues.length} issues</span>
                  <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1">{strengths.length} strengths</span>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-black/20 p-4 text-sm text-white/55">
              <div className="mb-2 text-xs uppercase tracking-[0.24em] text-white/35">Highlights</div>
              <div className="space-y-1">
                {strengths.slice(0, 3).map((strength: string) => (
                  <div key={strength} className="flex items-start gap-2">
                    <ShieldAlert className="mt-0.5 h-4 w-4 text-emerald-300" />
                    <span>{strength}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-4 lg:p-6">
          <div className="relative flex flex-wrap gap-2">
            {(["issues", "god-files", "cycles", "coupling", "external"] as TabKey[]).map((tab) => {
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`relative rounded-full px-4 py-2.5 text-sm transition ${active ? "text-white" : "text-white/45 hover:text-white"}`}
                >
                  {active && <span className="absolute inset-0 rounded-full bg-white/[0.08] ring-1 ring-cyan-400/20" />}
                  <span className="relative">{tab.replace("-", " ")}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6">
            {activeTab === "issues" && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {["critical", "high", "medium", "low"].map((severity) => (
                    <button key={severity} type="button" className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs uppercase tracking-[0.22em] text-white/50 transition hover:border-cyan-400/30 hover:text-white">
                      {severity}
                    </button>
                  ))}
                </div>

                {issues.map((issue: any, index: number) => {
                  const open = openIssue === index;
                  return (
                    <article key={`${issue.title}-${index}`} className="overflow-hidden rounded-[28px] border border-white/10 bg-black/20">
                      <button type="button" onClick={() => setOpenIssue(open ? null : index)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
                        <div>
                          <div className="flex items-center gap-3">
                            <SeverityPill severity={issue.severity || "low"} />
                            <h3 className="text-lg font-semibold text-white">{issue.title}</h3>
                          </div>
                          <p className="mt-2 text-sm text-white/50">{issue.description}</p>
                        </div>
                        <ChevronDown className={`h-5 w-5 text-white/45 transition ${open ? "rotate-180" : ""}`} />
                      </button>

                      {open && (
                        <div className="border-t border-white/10 px-5 py-5">
                          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                            <div className="space-y-3">
                              <div className="text-xs uppercase tracking-[0.24em] text-white/35">Description</div>
                              <p className="text-sm text-white/60">{issue.description}</p>
                              <div className="rounded-2xl border border-white/10 bg-[#0d0f14] p-4">
                                <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-cyan-200"><Code2 className="h-3.5 w-3.5" /> Affected code</div>
                                <pre className="overflow-auto text-xs leading-6 text-cyan-100"><code>{(issue.involved_files || []).join("\n") || "No code excerpt returned."}</code></pre>
                              </div>
                            </div>
                            <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4">
                              <div className="mb-2 text-xs uppercase tracking-[0.24em] text-rose-100">Suggested fix</div>
                              <div className="border-l-2 border-rose-300 pl-4 text-sm text-rose-50/90">{issue.suggested_fix}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}

            {activeTab === "god-files" && (
              <div className="space-y-4">
                {godFiles.map((file: any) => {
                  const total = Math.max(file.in_degree + file.out_degree, 1);
                  const inWidth = Math.round((file.in_degree / total) * 100);
                  const outWidth = 100 - inWidth;
                  return (
                    <div key={file.path} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <code className="truncate text-sm text-cyan-100">{file.path}</code>
                        <div className="text-xs text-white/45">in {file.in_degree} / out {file.out_degree}</div>
                      </div>
                      <div className="mt-4 overflow-hidden rounded-full bg-white/5">
                        <div className="flex h-3">
                          <div className="bg-cyan-400/90" style={{ width: `${inWidth}%` }} />
                          <div className="bg-violet-400/70" style={{ width: `${outWidth}%` }} />
                        </div>
                      </div>
                      <div className="mt-2 flex justify-between text-[11px] uppercase tracking-[0.2em] text-white/35">
                        <span>imports</span>
                        <span>dependents</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === "cycles" && (
              <div className="rounded-[28px] border border-dashed border-amber-400/30 bg-amber-500/5 p-5">
                <div className="mb-4 flex items-center gap-2 text-amber-100"><AlertTriangle className="h-4 w-4" /> Circular dependency chain</div>
                <div className="flex flex-wrap items-center gap-3">
                  {cycle.map((node, index) => (
                    <div key={`${node}-${index}`} className="flex items-center gap-3">
                      <span className="rounded-full border border-amber-300/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-50">{node}</span>
                      {index < cycle.length - 1 && <ArrowRight className="h-4 w-4 text-amber-200/70" />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "coupling" && (
              <div className="space-y-3">
                {coupling.map((item: any) => (
                  <div key={`${item.file_a}-${item.file_b}`} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <div className="flex items-start gap-3 text-sm text-white/70">
                      <Link2 className="mt-0.5 h-4 w-4 text-cyan-200" />
                      <div>
                        <div className="font-medium text-white">{item.file_a}</div>
                        <div className="mt-1 text-white/45">↔ {item.file_b}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "external" && (
              <div className="space-y-3">
                {external.map((item: any) => (
                  <div key={item.name} className="flex items-center justify-between rounded-[24px] border border-white/10 bg-black/20 px-4 py-4">
                    <span className="text-sm text-white/80">{item.name}</span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/45">usage {item.usage}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
