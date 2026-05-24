"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { analysisAPI } from "@/lib/api";
import { CodeViewer } from "@/components/shared/CodeViewer";

export default function OnboardingPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [topic, setTopic] = useState("How does authentication work?");
  const [submittedTopic, setSubmittedTopic] = useState("");

  const query = useQuery({
    queryKey: ["onboarding", projectId, submittedTopic],
    queryFn: () => analysisAPI.onboarding(projectId, submittedTopic),
    enabled: Boolean(submittedTopic),
  });

  const result = useMemo(() => query.data?.data?.data ?? query.data?.data ?? null, [query.data]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmittedTopic(topic.trim());
  }

  return (
    <div style={{ padding: "var(--space-8)", maxWidth: 1200 }}>
      <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-6)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
        <Link href="/dashboard">Projects</Link>
        <span>/</span>
        <Link href={`/dashboard/${projectId}`}>Overview</Link>
        <span>/</span>
        <span>Onboarding</span>
      </div>

      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 700, marginBottom: "var(--space-2)" }}>Onboarding Guide</h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "var(--space-6)" }}>Ask a question and get a structured explanation of the codebase.</p>

      <form onSubmit={handleSubmit} className="panel pad" style={{ marginBottom: "var(--space-6)", display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="How does authentication work?"
          style={{
            flex: 1,
            minWidth: 240,
            padding: "var(--space-3)",
            borderRadius: "var(--radius-md)",
            background: "var(--color-surface-2)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text)",
          }}
        />
        <button type="submit" style={{ padding: "var(--space-3) var(--space-5)", borderRadius: "var(--radius-md)", background: "var(--color-primary)", color: "#000", fontWeight: 700 }}>
          Generate guide
        </button>
      </form>

      {query.isFetching && <div className="skeleton" style={{ height: 180, borderRadius: "var(--radius-xl)" }} />}

      {result && !query.isFetching && (
        <div style={{ display: "grid", gap: "var(--space-4)" }}>
          <div className="panel pad">
            <h2 style={{ marginBottom: "var(--space-2)" }}>{result.topic ?? submittedTopic}</h2>
            <p style={{ color: "var(--color-text-muted)" }}>{result.summary ?? "No summary returned."}</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-4)" }}>
            <div className="panel pad">
              <h3 style={{ marginBottom: "var(--space-3)" }}>Entry points</h3>
              <ul style={{ paddingLeft: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                {(result.entry_points ?? []).map((item: string) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div className="panel pad">
              <h3 style={{ marginBottom: "var(--space-3)" }}>Key files</h3>
              <ul style={{ paddingLeft: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                {(result.key_files ?? []).map((item: string) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>

          <div className="panel pad">
            <h3 style={{ marginBottom: "var(--space-3)" }}>Execution flow</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {(result.execution_flow ?? []).map((step: any) => (
                <div key={`${step.step}-${step.file}`} style={{ padding: "var(--space-3)", borderRadius: "var(--radius-md)", background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
                  <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                    <strong>Step {step.step}</strong>
                    <span>{step.file}</span>
                    <span>{step.function}</span>
                  </div>
                  <p style={{ marginTop: "var(--space-2)", color: "var(--color-text-muted)" }}>{step.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-4)" }}>
            <div className="panel pad">
              <h3 style={{ marginBottom: "var(--space-3)" }}>Reading order</h3>
              <ol style={{ paddingLeft: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                {(result.suggested_reading_order ?? []).map((item: string) => <li key={item}>{item}</li>)}
              </ol>
            </div>
            <div className="panel pad">
              <h3 style={{ marginBottom: "var(--space-3)" }}>Data models</h3>
              <ul style={{ paddingLeft: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                {(result.data_models_involved ?? []).map((item: string) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>

          <div className="panel pad">
            <h3 style={{ marginBottom: "var(--space-3)" }}>Gotchas</h3>
            <ul style={{ paddingLeft: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {(result.gotchas ?? []).map((item: string) => <li key={item}>{item}</li>)}
            </ul>
          </div>

          <details className="panel pad">
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>Raw output</summary>
            <div style={{ marginTop: "var(--space-4)" }}>
              <CodeViewer code={JSON.stringify(result, null, 2)} />
            </div>
          </details>
        </div>
      )}
    </div>
  );
}export default function OnboardingPage() {
  return (
    <main className="section"><div className="container"><div className="panel pad">Onboarding guide view coming here.</div></div></main>
  );
}
