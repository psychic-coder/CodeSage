"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Clock3, FilePlus2, FileText, Shield, Sparkles, Zap } from "lucide-react";
import { analysisAPI } from "@/lib/api";
import { improvementFallback, normalizeList, recommendationFallback, unwrapAnalysis } from "@/lib/dashboard-ui";

const categories = [
  { key: "security", label: "Security", icon: Shield, color: "#F43F5E" },
  { key: "performance", label: "Performance", icon: Zap, color: "#22D3EE" },
  { key: "refactoring", label: "Refactoring", icon: Sparkles, color: "#A78BFA" },
];

const accentMap: Record<string, string> = {
  security: "from-rose-400/20 to-rose-500/5 border-rose-400/20",
  performance: "from-cyan-400/20 to-cyan-500/5 border-cyan-400/20",
  refactoring: "from-violet-400/20 to-violet-500/5 border-violet-400/20",
};

function ComplexityBadge({ value }: { value: string }) {
  const palette: Record<string, string> = {
    low: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
    medium: "border-amber-400/30 bg-amber-500/10 text-amber-100",
    high: "border-rose-400/30 bg-rose-500/10 text-rose-100",
  };
  return <span className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.22em] ${palette[value] || palette.low}`}>{value}</span>;
}

export function ImprovementsPage({ projectId }: { projectId: string }) {
  const [category, setCategory] = useState("");

  const improvementsQuery = useQuery({ queryKey: ["improvements", projectId, category], queryFn: () => analysisAPI.improvements(projectId, category || undefined) });
  const recommendationsQuery = useQuery({ queryKey: ["recommendations", projectId], queryFn: () => analysisAPI.recommendations(projectId) });

  const improvements = normalizeList<any>(unwrapAnalysis<any>(improvementsQuery.data)?.improvements || unwrapAnalysis<any>(improvementsQuery.data), improvementFallback.improvements);
  const recommendations = normalizeList<any>(unwrapAnalysis<any>(recommendationsQuery.data)?.recommendations || unwrapAnalysis<any>(recommendationsQuery.data), recommendationFallback);

  const stats = useMemo(() => {
    const security = improvements.filter((item) => item.category === "security").length || improvementFallback.stats.security;
    const performance = improvements.filter((item) => item.category === "performance").length || improvementFallback.stats.performance;
    const refactoring = improvements.filter((item) => item.category === "refactoring").length || improvementFallback.stats.refactoring;
    const critical = improvements.filter((item) => item.severity === "critical").length || improvementFallback.stats.critical;
    return { security, performance, refactoring, critical };
  }, [improvements]);

  return (
    <div className="px-5 py-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Security", value: stats.security, icon: Shield, tone: "from-rose-400/20 to-rose-500/5 border-rose-400/20" },
            { label: "Performance", value: stats.performance, icon: Zap, tone: "from-cyan-400/20 to-cyan-500/5 border-cyan-400/20" },
            { label: "Refactoring", value: stats.refactoring, icon: Sparkles, tone: "from-violet-400/20 to-violet-500/5 border-violet-400/20" },
            { label: "Critical", value: stats.critical, icon: FileText, tone: "from-amber-400/20 to-amber-500/5 border-amber-400/20" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={`rounded-[28px] border bg-gradient-to-br ${item.tone} p-5 text-white shadow-[0_18px_60px_rgba(0,0,0,0.2)]`}>
                <Icon className="h-5 w-5 text-white/80" />
                <div className="mt-8 text-xs uppercase tracking-[0.28em] text-white/35">{item.label}</div>
                <div className="mt-3 text-3xl font-semibold text-white">{item.value}</div>
              </div>
            );
          })}
        </section>

        <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-5 lg:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2 text-xs uppercase tracking-[0.24em] text-white/35">Filter</span>
            {categories.map((item) => {
              const active = category === item.key;
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setCategory(active ? "" : item.key)}
                  className="group relative overflow-hidden rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-white/60 transition hover:border-white/20 hover:text-white"
                  style={{ color: active ? item.color : undefined }}
                >
                  {active && <span className="absolute inset-0 animate-ping rounded-full bg-white/10" />}
                  <span className="relative flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_0.92fr]">
          <div className="space-y-4">
            {improvements.map((item: any, index: number) => {
              const categoryKey = item.category || "refactoring";
              const gradient = accentMap[categoryKey] || accentMap.refactoring;
              return (
                <article key={item.id || `${item.file}-${index}`} className={`overflow-hidden rounded-[28px] border bg-gradient-to-br ${gradient} p-[1px]`}>
                  <div className="rounded-[27px] border border-white/5 bg-[#0d0f14]/95 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[11px] uppercase tracking-[0.22em] text-white/45">{categoryKey}</span>
                          <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[11px] uppercase tracking-[0.22em] text-white/45">{item.severity}</span>
                          <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[11px] uppercase tracking-[0.22em] text-white/45">{item.effort}</span>
                        </div>
                        <h3 className="mt-3 text-xl font-semibold text-white">{item.title}</h3>
                        <p className="mt-2 max-w-3xl text-sm text-white/55">{item.explanation}</p>
                      </div>

                      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/45">
                        <Clock3 className="h-3.5 w-3.5 text-cyan-200" />
                        Effort {item.effort}
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 xl:grid-cols-[0.88fr_1.12fr]">
                      <button type="button" className="inline-flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left text-sm text-white/70 transition hover:border-cyan-400/25 hover:bg-white/[0.03]" onClick={() => navigator.clipboard.writeText(item.file || "") }>
                        <span className="flex items-center gap-3 truncate">
                          <FileText className="h-4 w-4 text-cyan-200" />
                          <span className="truncate font-mono">{item.file}</span>
                        </span>
                        <span className="text-[11px] uppercase tracking-[0.22em] text-white/35">copy</span>
                      </button>

                      {item.code_snippet ? (
                        <pre className="overflow-auto rounded-2xl border border-white/10 bg-[#0d0f14] p-4 text-xs leading-6 text-cyan-100"><code>{item.code_snippet}</code></pre>
                      ) : null}
                    </div>

                    <div className="mt-5 rounded-2xl border-l-2 border-cyan-300/70 bg-cyan-400/10 p-4 text-sm text-cyan-50/90">
                      <div className="text-xs uppercase tracking-[0.24em] text-cyan-100/55">Suggested fix</div>
                      <p className="mt-2">{item.suggested_fix}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <section className="space-y-4 rounded-[32px] border border-white/10 bg-white/[0.04] p-5 lg:p-6">
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-white/35">Feature ideas</div>
              <h2 className="mt-2 text-2xl font-semibold text-white">Recommendations</h2>
            </div>

            <div className="space-y-4">
              {recommendations.map((item: any) => (
                <article key={item.feature} className="rounded-[26px] border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-white">{item.feature}</h3>
                    <ComplexityBadge value={item.complexity || "low"} />
                  </div>
                  <p className="mt-2 text-sm text-white/55">{item.rationale}</p>

                  <div className="mt-4 space-y-3">
                    <div>
                      <div className="mb-2 text-[11px] uppercase tracking-[0.24em] text-white/35">Files to create (+)</div>
                      <div className="flex flex-wrap gap-2">
                        {(item.files_to_create || []).map((file: string) => (
                          <span key={file} className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-100 font-mono">+ {file}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 text-[11px] uppercase tracking-[0.24em] text-white/35">Files to modify (~)</div>
                      <div className="flex flex-wrap gap-2">
                        {(item.files_to_modify || []).map((file: string) => (
                          <span key={file} className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-100 font-mono">~ {file}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}
