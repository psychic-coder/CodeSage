"use client";

import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, FileCode2, Layers3, Sparkles, Target } from "lucide-react";
import { analysisAPI } from "@/lib/api";
import { FileChangeList } from "@/components/analysis/FileChangeList";
import type { ImpactResult } from "@/types";

export function ImpactPage({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImpactResult | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!query.trim()) return;
    setError("");
    setLoading(true);
    try {
      const response = await analysisAPI.impact(projectId, query.slice(0, 2000));
      setResult(response.data.data);
      qc.invalidateQueries({ queryKey: ["graph-stats", projectId] });
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-5 py-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[34px] border border-white/10 bg-white/[0.04] p-6 lg:p-8">
          <div className="text-xs uppercase tracking-[0.28em] text-white/35">Impact analysis</div>
          <h1 className="mt-2 text-3xl font-semibold text-white">Describe a change, get the blast radius</h1>
          <p className="mt-3 max-w-3xl text-sm text-white/55">Predict which files need to move, what to create, and how the change propagates through the codebase before a line is written.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <textarea value={query} onChange={(event) => setQuery(event.target.value)} rows={5} placeholder="e.g. Add organization-scoped billing with invoices, receipts, and permission checks." className="w-full rounded-[28px] border border-white/10 bg-[#0d0f14] px-5 py-4 text-sm text-white outline-none placeholder:text-white/30" />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-white/35">Use the prompt to predict `files_to_modify`, `files_to_create`, and downstream risks.</div>
              <button type="submit" disabled={loading || !query.trim()} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-cyan-100 disabled:opacity-40">
                {loading ? "Analyzing..." : "Predict impact"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        </section>

        {error ? <div className="rounded-[28px] border border-rose-400/25 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div> : null}

        {loading ? (
          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 text-white/55">Running impact analysis...</div>
        ) : result ? (
          <div className="space-y-6">
            <section className="grid gap-4 md:grid-cols-4">
              {[
                { label: "Files to modify", value: result.files_to_modify?.length ?? 0, tone: "from-amber-400/20 to-amber-500/5 border-amber-400/20" },
                { label: "Files to create", value: result.files_to_create?.length ?? 0, tone: "from-emerald-400/20 to-emerald-500/5 border-emerald-400/20" },
                { label: "Downstream risks", value: result.downstream_risks?.length ?? 0, tone: "from-rose-400/20 to-rose-500/5 border-rose-400/20" },
                { label: "Complexity", value: result.estimated_complexity?.replace("_", " "), tone: "from-cyan-400/20 to-cyan-500/5 border-cyan-400/20" },
              ].map((item) => (
                <div key={item.label} className={`rounded-[28px] border bg-gradient-to-br ${item.tone} p-5`}>
                  <div className="text-xs uppercase tracking-[0.28em] text-white/35">{item.label}</div>
                  <div className="mt-3 text-2xl font-semibold text-white">{item.value}</div>
                </div>
              ))}
            </section>

            <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
              <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-white/35"><FileCode2 className="h-4 w-4 text-cyan-200" /> Files to change</div>
                <div className="mt-5 space-y-6">
                  <FileChangeList title="Files to modify" files={result.files_to_modify || []} accent="var(--color-warning)" />
                  <FileChangeList title="Files to create" files={result.files_to_create || []} accent="var(--color-success)" />
                </div>
              </section>

              <section className="space-y-4 rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-white/35"><Layers3 className="h-4 w-4 text-cyan-200" /> Risk flow</div>
                <div className="space-y-3">
                  {(result.downstream_risks || []).map((risk, index) => (
                    <div key={`${risk.file}-${index}`} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <code className="text-xs text-cyan-100">{risk.file}</code>
                      <p className="mt-2 text-sm text-white/60">{risk.risk}</p>
                      <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white/40">
                        <Target className="h-3.5 w-3.5" /> {risk.risk_level}
                      </div>
                    </div>
                  ))}
                </div>

                {result.dependencies_to_add?.length ? (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs uppercase tracking-[0.24em] text-white/35">Dependencies to add</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {result.dependencies_to_add.map((item) => (
                        <span key={item} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-mono text-white/60">{item}</span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {result.implementation_order?.length ? (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs uppercase tracking-[0.24em] text-white/35">Implementation order</div>
                    <ol className="mt-3 space-y-2 text-sm text-white/65">
                      {result.implementation_order.map((step, index) => (
                        <li key={step} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400/10 text-xs text-cyan-100">{index + 1}</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}
              </section>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
