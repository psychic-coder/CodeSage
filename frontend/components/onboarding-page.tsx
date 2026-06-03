"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Copy, History, Loader2, Sparkles, Wand2, BookOpen, Package } from "lucide-react";
import { analysisAPI } from "@/lib/api";
import { onboardingFallback, presetQuestions, unwrapAnalysis } from "@/lib/dashboard-ui";
import { GraphLink } from "./shared/GraphLink";

const HISTORY_KEY = "codesage_onboarding_history";

export function OnboardingPage({ projectId }: { projectId: string }) {
  const [topic, setTopic] = useState(presetQuestions[0]);
  const [submittedTopic, setSubmittedTopic] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(HISTORY_KEY);
      if (saved) setHistory(JSON.parse(saved));
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 8)));
  }, [history]);

  const query = useQuery({
    queryKey: ["onboarding", projectId, submittedTopic],
    queryFn: () => analysisAPI.onboarding(projectId, submittedTopic),
    enabled: Boolean(submittedTopic),
  });

  const result = unwrapAnalysis<any>(query.data)?.data || unwrapAnalysis<any>(query.data) || onboardingFallback;
  const executionFlow = result.execution_flow || onboardingFallback.execution_flow;
  const gotchas = result.gotchas || onboardingFallback.gotchas;

  const markdown = useMemo(() => {
    const lines = [
      `# ${result.topic || submittedTopic || onboardingFallback.topic}`,
      "",
      result.summary || onboardingFallback.summary,
      "",
      "## Execution Flow",
      ...executionFlow.map((step: any) => `- Step ${step.step}: ${step.function} (${step.file}) - ${step.description}`),
      "",
      "## Gotchas",
      ...gotchas.map((item: string) => `- ${item}`),
    ];
    return lines.join("\n");
  }, [executionFlow, gotchas, result.summary, result.topic, submittedTopic]);

  function submitTopic(value: string) {
    const normalized = value.trim();
    if (!normalized) return;
    setSubmittedTopic(normalized);
    setHistory((current) => [normalized, ...current.filter((item) => item !== normalized)].slice(0, 8));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitTopic(topic);
  }

  async function copyMarkdown() {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="px-5 py-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-[32px] border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-white/35"><History className="h-4 w-4 text-cyan-200" /> Query history</div>
          <div className="mt-4 space-y-2">
            {history.length ? history.map((item) => (
              <button key={item} type="button" onClick={() => { setTopic(item); submitTopic(item); }} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left text-sm text-white/70 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-white">
                {item}
              </button>
            )) : <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-sm text-white/45">Generated guides will appear here.</div>}
          </div>
        </aside>

        <main className="space-y-4">
          <section className="rounded-[34px] border border-white/10 bg-white/[0.04] p-6 lg:p-8">
            <div className="text-xs uppercase tracking-[0.28em] text-white/35">Onboarding guide</div>
            <h1 className="mt-2 text-3xl font-semibold text-white">What do you want to know about this codebase?</h1>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="rounded-[30px] border border-cyan-400/25 bg-[linear-gradient(135deg,rgba(34,211,238,0.12),rgba(167,139,250,0.10),rgba(255,255,255,0.02))] p-1 shadow-[0_0_60px_rgba(34,211,238,0.10)]">
                <div className="flex items-center gap-3 rounded-[28px] border border-white/10 bg-[#0d0f14]/90 px-5 py-4">
                  <Wand2 className="h-5 w-5 text-cyan-200" />
                  <input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="What do you want to know about this codebase?" className="w-full bg-transparent text-base text-white outline-none placeholder:text-white/30" />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {presetQuestions.map((item) => (
                  <button key={item} type="button" onClick={() => { setTopic(item); submitTopic(item); }} className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-white/65 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-white">
                    {item}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-white/35">Click a preset to auto-run the search and stream the guide.</div>
                <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-cyan-100">
                  <Sparkles className="h-4 w-4" /> Generate guide
                </button>
              </div>
            </form>
          </section>

          {query.isFetching ? (
            <section className="space-y-4 rounded-[34px] border border-white/10 bg-white/[0.04] p-6 lg:p-8">
              <div className="flex items-center gap-3 text-white/60"><Loader2 className="h-4 w-4 animate-spin text-cyan-200" /> Synthesizing the guide...</div>
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-24 rounded-3xl border border-white/10 bg-white/5" />)}
              </div>
            </section>
          ) : (
            <section className="space-y-4 rounded-[34px] border border-white/10 bg-white/[0.04] p-6 lg:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.28em] text-white/35">Active guide</div>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{result.topic || submittedTopic || onboardingFallback.topic}</h2>
                </div>
                <button onClick={copyMarkdown} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white/70 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-white">
                  {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy as Markdown"}
                </button>
              </div>

              <p className="max-w-4xl text-sm leading-7 text-white/60">{result.summary || onboardingFallback.summary}</p>

              <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
                <div className="relative rounded-[30px] border border-white/10 bg-black/20 p-5">
                  <div className="absolute left-7 top-5 bottom-5 w-px bg-gradient-to-b from-cyan-300/60 via-white/10 to-transparent" />
                  <div className="space-y-6 pl-10">
                    {executionFlow.map((step: any) => (
                      <div key={`${step.step}-${step.file}`} className="relative">
                        <div className="absolute -left-[49px] top-1 flex h-8 w-8 items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-400/10 text-sm font-semibold text-cyan-100">{step.step}</div>
                        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                          <div className="flex flex-wrap items-center gap-3">
                            <code className="text-sm text-cyan-100">{step.function}</code>
                            <GraphLink projectId={projectId} file={step.file} />
                          </div>
                          <p className="mt-3 text-sm leading-6 text-white/60">{step.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[30px] border border-amber-400/25 bg-amber-500/10 p-5">
                    <div className="text-xs uppercase tracking-[0.24em] text-amber-100/70">Gotchas</div>
                    <ul className="mt-3 space-y-2 text-sm text-amber-50/90">
                      {gotchas.map((item: string) => <li key={item}>• {item}</li>)}
                    </ul>
                  </div>

                  <div className="rounded-[30px] border border-white/10 bg-black/20 p-5">
                    <div className="text-xs uppercase tracking-[0.24em] text-white/35">Key files</div>
                    <div className="mt-3 space-y-2">
                      {(result.key_files || onboardingFallback.key_files).map((item: string) => (
                        <GraphLink key={item} projectId={projectId} file={item} />
                      ))}
                    </div>
                  </div>

                  {result.suggested_reading_order?.length > 0 && (
                    <div className="rounded-[30px] border border-white/10 bg-black/20 p-5">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-cyan-200">
                        <BookOpen className="h-3.5 w-3.5" /> Reading order
                      </div>
                      <div className="mt-3 space-y-2">
                        {result.suggested_reading_order.map((item: string, index: number) => (
                          <div key={item} className="flex items-center gap-3">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[10px] text-white/60">{index + 1}</div>
                            <GraphLink projectId={projectId} file={item} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.external_dependencies?.length > 0 && (
                    <div className="rounded-[30px] border border-white/10 bg-black/20 p-5">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-violet-200">
                        <Package className="h-3.5 w-3.5" /> External deps
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {result.external_dependencies.map((dep: string) => (
                          <span key={dep} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/60">{dep}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
