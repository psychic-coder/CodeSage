"use client";

import { useMemo, useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { analysisAPI } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Lock,
  Database,
  Globe,
  Server,
  Box,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  Package,
  History,
  Clock,
  ArrowRight,
  ChevronRight,
  BookOpen,
} from "lucide-react";

// ────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────

interface HistoryEntry {
  topic: string;
  timestamp: number;
  result: any;
}

// ────────────────────────────────────────────────────
// Preset Topics
// ────────────────────────────────────────────────────

const PRESET_TOPICS = [
  { topic: "How does authentication work?", icon: Lock },
  { topic: "How is data persisted?", icon: Database },
  { topic: "How does the API layer work?", icon: Globe },
  { topic: "What is the background job system?", icon: Server },
  { topic: "What are the core data models?", icon: Box },
];

// ────────────────────────────────────────────────────
// Helper Components
// ────────────────────────────────────────────────────

function GraphLink({ projectId, file }: { projectId: string; file: string }) {
  return (
    <Link
      href={`/dashboard/${projectId}/graph?focus=${encodeURIComponent(file)}`}
      title={file}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        background: "var(--color-surface-2)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        fontSize: "var(--text-xs)",
        color: "var(--color-text)",
        fontFamily: "monospace",
        textDecoration: "none",
      }}
    >
      {file.split("/").pop()}
      <ExternalLink size={10} style={{ color: "var(--color-text-muted)" }} />
    </Link>
  );
}

// ────────────────────────────────────────────────────
// Main Page
// ────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [topic, setTopic] = useState("");
  const [submittedTopic, setSubmittedTopic] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isCopied, setIsCopied] = useState(false);

  // Use state to hold the actively displayed result (either from fetch or from history)
  const [activeResult, setActiveResult] = useState<any>(null);

  const query = useQuery({
    queryKey: ["onboarding", projectId, submittedTopic],
    queryFn: () => analysisAPI.onboarding(projectId, submittedTopic),
    enabled: Boolean(submittedTopic),
  });

  // Load history on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`codesage_onboarding_${projectId}`);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to parse onboarding history", e);
    }
  }, [projectId]);

  // Update history when new query succeeds
  useEffect(() => {
    if (query.data && submittedTopic) {
      const resultData = query.data?.data?.data ?? query.data?.data ?? null;
      if (resultData) {
        setActiveResult(resultData);

        setHistory((prev) => {
          // Remove if it already exists to move it to the top
          const filtered = prev.filter(
            (h) => h.topic.toLowerCase() !== submittedTopic.toLowerCase(),
          );
          const next = [
            {
              topic: submittedTopic,
              timestamp: Date.now(),
              result: resultData,
            },
            ...filtered,
          ].slice(0, 5); // Keep max 5

          try {
            localStorage.setItem(
              `codesage_onboarding_${projectId}`,
              JSON.stringify(next),
            );
          } catch (e) {}
          return next;
        });
      }
    }
  }, [query.data, submittedTopic, projectId]);

  function handleSubmit(e: FormEvent<HTMLFormElement> | string) {
    if (typeof e !== "string") {
      e.preventDefault();
    }
    const t = typeof e === "string" ? e : topic;
    const cleanTopic = t.trim();
    if (!cleanTopic) return;

    // Check if we already have it in history to avoid refetching immediately
    const existing = history.find(
      (h) => h.topic.toLowerCase() === cleanTopic.toLowerCase(),
    );
    if (existing) {
      setActiveResult(existing.result);
      setTopic(existing.topic);
      setSubmittedTopic(existing.topic); // Will trigger a background refetch due to react-query, but we show cached UI immediately
    } else {
      setActiveResult(null); // Clear while fetching new
      setSubmittedTopic(cleanTopic);
    }
  }

  const handleCopyMarkdown = () => {
    if (!activeResult) return;

    let md = `# Onboarding Guide: ${activeResult.topic ?? submittedTopic}\n\n`;

    if (activeResult.summary) {
      md += `${activeResult.summary}\n\n`;
    }

    if (activeResult.entry_points?.length) {
      md += `## Entry Points\n`;
      activeResult.entry_points.forEach(
        (ep: string) => (md += `- \`${ep}\`\n`),
      );
      md += "\n";
    }

    if (activeResult.execution_flow?.length) {
      md += `## Execution Flow\n`;
      activeResult.execution_flow.forEach((step: any) => {
        md += `${step.step}. **${step.function}** (\`${step.file}\`) - ${step.description}\n`;
      });
      md += "\n";
    }

    if (activeResult.suggested_reading_order?.length) {
      md += `## Reading Order\n`;
      activeResult.suggested_reading_order.forEach(
        (file: string, idx: number) => {
          md += `${idx + 1}. \`${file}\`\n`;
        },
      );
      md += "\n";
    }

    if (activeResult.gotchas?.length) {
      md += `## Gotchas & Pitfalls\n`;
      activeResult.gotchas.forEach(
        (g: string) => (md += `> ⚠️ **Warning:** ${g}\n`),
      );
      md += "\n";
    }

    if (activeResult.external_dependencies?.length) {
      md += `## External Dependencies\n`;
      activeResult.external_dependencies.forEach(
        (d: string) => (md += `- \`${d}\`\n`),
      );
      md += "\n";
    }

    navigator.clipboard.writeText(md).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const isLoading = query.isFetching && !activeResult;

  return (
    <div
      style={{
        padding: "var(--space-8)",
        maxWidth: 1200,
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: history.length > 0 ? "300px 1fr" : "1fr",
        gap: "var(--space-8)",
        alignItems: "start",
      }}
    >
      {/* Sidebar (History) */}
      {history.length > 0 && (
        <aside
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
            position: "sticky",
            top: "var(--space-8)",
          }}
        >
          <h3
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              color: "var(--color-text-muted)",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            <History size={16} /> Recent Guides
          </h3>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
            }}
          >
            {history.map((entry, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setTopic(entry.topic);
                  handleSubmit(entry.topic);
                }}
                style={{
                  textAlign: "left",
                  padding: "var(--space-3)",
                  background:
                    submittedTopic.toLowerCase() === entry.topic.toLowerCase()
                      ? "var(--color-primary-highlight)"
                      : "var(--color-surface)",
                  border: `1px solid ${submittedTopic.toLowerCase() === entry.topic.toLowerCase() ? "var(--color-primary)" : "var(--color-border)"}`,
                  borderRadius: "var(--radius-md)",
                  color:
                    submittedTopic.toLowerCase() === entry.topic.toLowerCase()
                      ? "var(--color-primary)"
                      : "var(--color-text)",
                  fontSize: "var(--text-sm)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  transition: "all 0.2s",
                }}
              >
                <span style={{ fontWeight: 500, lineHeight: 1.4 }}>
                  {entry.topic}
                </span>
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--color-text-muted)",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Clock size={12} />{" "}
                  {new Date(entry.timestamp).toLocaleDateString()}
                </span>
              </button>
            ))}
          </div>
        </aside>
      )}

      {/* Main Content */}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            gap: "var(--space-2)",
            marginBottom: "var(--space-6)",
            fontSize: "var(--text-xs)",
            color: "var(--color-text-muted)",
          }}
        >
          <Link
            href="/dashboard"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            Projects
          </Link>
          <span>/</span>
          <Link
            href={`/dashboard/${projectId}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            Overview
          </Link>
          <span>/</span>
          <span style={{ color: "var(--color-text)" }}>Onboarding</span>
        </div>

        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-2xl)",
            fontWeight: 700,
            marginBottom: "var(--space-2)",
          }}
        >
          Onboarding Guide
        </h1>
        <p
          style={{
            color: "var(--color-text-muted)",
            marginBottom: "var(--space-6)",
          }}
        >
          Ask a question and get a structured, step-by-step explanation of the
          codebase.
        </p>

        {/* Search Bar */}
        <form
          onSubmit={handleSubmit}
          className="panel pad"
          style={{
            marginBottom: "var(--space-4)",
            display: "flex",
            gap: "var(--space-3)",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Search size={20} style={{ color: "var(--color-text-muted)" }} />
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. How does authentication work?"
            style={{
              flex: 1,
              minWidth: 240,
              padding: "var(--space-3) 0",
              background: "transparent",
              border: "none",
              color: "var(--color-text)",
              fontSize: "var(--text-base)",
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={!topic.trim() || query.isFetching}
            style={{
              padding: "var(--space-2) var(--space-4)",
              borderRadius: "var(--radius-md)",
              background: "var(--color-primary)",
              color: "#000",
              fontWeight: 600,
              cursor:
                !topic.trim() || query.isFetching ? "not-allowed" : "pointer",
              opacity: !topic.trim() || query.isFetching ? 0.7 : 1,
            }}
          >
            {query.isFetching ? "Generating..." : "Generate guide"}
          </button>
        </form>

        {/* Preset Pills */}
        {!activeResult && !isLoading && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "var(--space-2)",
              marginBottom: "var(--space-6)",
            }}
          >
            <span
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--color-text-muted)",
                alignSelf: "center",
                marginRight: 8,
              }}
            >
              Suggestions:
            </span>
            {PRESET_TOPICS.map((preset) => (
              <button
                key={preset.topic}
                onClick={() => {
                  setTopic(preset.topic);
                  handleSubmit(preset.topic);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: "var(--radius-full)",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                  color: "var(--color-text)",
                  fontSize: "var(--text-xs)",
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
              >
                <preset.icon
                  size={14}
                  style={{ color: "var(--color-primary)" }}
                />
                {preset.topic}
              </button>
            ))}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-6)",
            }}
          >
            <div
              className="skeleton"
              style={{ height: 120, borderRadius: "var(--radius-xl)" }}
            />
            <div
              className="skeleton"
              style={{ height: 200, borderRadius: "var(--radius-xl)" }}
            />
          </div>
        )}

        {/* Results */}
        {activeResult && !isLoading && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-6)",
            }}
          >
            {/* Header / Summary */}
            <div className="panel pad" style={{ position: "relative" }}>
              <button
                onClick={handleCopyMarkdown}
                title="Copy as Markdown"
                style={{
                  position: "absolute",
                  top: "var(--space-4)",
                  right: "var(--space-4)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 8px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text)",
                  cursor: "pointer",
                  fontSize: "var(--text-xs)",
                }}
              >
                {isCopied ? (
                  <Check size={14} style={{ color: "var(--color-success)" }} />
                ) : (
                  <Copy size={14} />
                )}
                {isCopied ? "Copied!" : "Copy"}
              </button>

              <h2
                style={{
                  fontSize: "var(--text-xl)",
                  marginBottom: "var(--space-4)",
                  paddingRight: 80,
                }}
              >
                {activeResult.topic ?? submittedTopic}
              </h2>
              <p
                style={{
                  color: "var(--color-text-muted)",
                  fontSize: "var(--text-base)",
                  lineHeight: 1.6,
                }}
              >
                {activeResult.summary ?? "No summary returned."}
              </p>

              {/* External Dependencies */}
              {activeResult.external_dependencies?.length > 0 && (
                <div
                  style={{
                    marginTop: "var(--space-6)",
                    paddingTop: "var(--space-4)",
                    borderTop: "1px solid var(--color-border)",
                  }}
                >
                  <p
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "var(--color-text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      marginBottom: "var(--space-3)",
                    }}
                  >
                    External Dependencies
                  </p>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "var(--space-2)",
                    }}
                  >
                    {activeResult.external_dependencies.map((dep: string) => (
                      <span
                        key={dep}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "4px 10px",
                          background: "var(--color-surface-2)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "var(--radius-full)",
                          fontSize: "var(--text-xs)",
                          color: "var(--color-text)",
                        }}
                      >
                        <Package
                          size={12}
                          style={{ color: "var(--color-primary)" }}
                        />{" "}
                        {dep}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Gotchas Panel */}
            {activeResult.gotchas?.length > 0 && (
              <div
                className="panel pad"
                style={{ borderLeft: "4px solid var(--color-warning)" }}
              >
                <h3
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    fontSize: "var(--text-lg)",
                    color: "var(--color-text)",
                    marginBottom: "var(--space-4)",
                  }}
                >
                  <AlertTriangle
                    size={20}
                    style={{ color: "var(--color-warning)" }}
                  />{" "}
                  Gotchas & Pitfalls
                </h3>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-3)",
                  }}
                >
                  {activeResult.gotchas.map((item: string, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        gap: "var(--space-3)",
                        alignItems: "flex-start",
                      }}
                    >
                      <div
                        style={{ marginTop: 4, color: "var(--color-warning)" }}
                      >
                        •
                      </div>
                      <p
                        style={{
                          color: "var(--color-text)",
                          fontSize: "var(--text-sm)",
                          fontStyle: "italic",
                          lineHeight: 1.5,
                        }}
                      >
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Execution Flow Timeline */}
            <div className="panel pad">
              <h3
                style={{
                  marginBottom: "var(--space-6)",
                  fontSize: "var(--text-lg)",
                }}
              >
                Execution Flow
              </h3>
              {activeResult.execution_flow?.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {activeResult.execution_flow.map((step: any, idx: number) => {
                    const isLast =
                      idx === activeResult.execution_flow.length - 1;
                    return (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          gap: "var(--space-4)",
                          position: "relative",
                        }}
                      >
                        {/* Timeline Connector */}
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            minWidth: 32,
                          }}
                        >
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 16,
                              background: "var(--color-primary)",
                              color: "#000",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "var(--text-sm)",
                              fontWeight: 700,
                              zIndex: 1,
                            }}
                          >
                            {step.step ?? idx + 1}
                          </div>
                          {!isLast && (
                            <div
                              style={{
                                width: 2,
                                flex: 1,
                                background: "var(--color-primary)",
                                opacity: 0.3,
                                margin: "4px 0",
                              }}
                            />
                          )}
                        </div>

                        {/* Step Content */}
                        <div
                          style={{
                            paddingBottom: isLast ? 0 : "var(--space-6)",
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              alignItems: "center",
                              gap: "var(--space-2)",
                              marginBottom: "var(--space-2)",
                            }}
                          >
                            <strong style={{ fontSize: "var(--text-base)" }}>
                              {step.function}
                            </strong>
                            <span style={{ color: "var(--color-text-muted)" }}>
                              in
                            </span>
                            <GraphLink projectId={projectId} file={step.file} />
                          </div>
                          <p
                            style={{
                              color: "var(--color-text-muted)",
                              fontSize: "var(--text-sm)",
                              lineHeight: 1.6,
                            }}
                          >
                            {step.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p
                  style={{
                    color: "var(--color-text-muted)",
                    fontSize: "var(--text-sm)",
                    fontStyle: "italic",
                  }}
                >
                  No execution steps identified.
                </p>
              )}
            </div>

            {/* Key Files & Reading Order */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "var(--space-4)",
              }}
            >
              <div className="panel pad">
                <h3
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    marginBottom: "var(--space-4)",
                    fontSize: "var(--text-lg)",
                  }}
                >
                  <BookOpen
                    size={18}
                    style={{ color: "var(--color-primary)" }}
                  />{" "}
                  Reading Order
                </h3>
                {activeResult.suggested_reading_order?.length > 0 ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--space-3)",
                    }}
                  >
                    {activeResult.suggested_reading_order.map(
                      (file: string, idx: number) => (
                        <div
                          key={file}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "var(--space-3)",
                          }}
                        >
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 12,
                              background: "var(--color-surface-2)",
                              color: "var(--color-text-muted)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "var(--text-xs)",
                              fontWeight: 600,
                            }}
                          >
                            {idx + 1}
                          </div>
                          <GraphLink projectId={projectId} file={file} />
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <p
                    style={{
                      color: "var(--color-text-muted)",
                      fontSize: "var(--text-sm)",
                      fontStyle: "italic",
                    }}
                  >
                    No reading order suggested.
                  </p>
                )}
              </div>

              <div className="panel pad">
                <h3
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    marginBottom: "var(--space-4)",
                    fontSize: "var(--text-lg)",
                  }}
                >
                  <Box size={18} style={{ color: "var(--color-primary)" }} />{" "}
                  Entry Points & Key Files
                </h3>

                {activeResult.entry_points?.length > 0 && (
                  <div style={{ marginBottom: "var(--space-4)" }}>
                    <h4
                      style={{
                        fontSize: "var(--text-xs)",
                        color: "var(--color-text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        marginBottom: "var(--space-2)",
                      }}
                    >
                      Entry Points
                    </h4>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "var(--space-2)",
                        alignItems: "flex-start",
                      }}
                    >
                      {activeResult.entry_points.map((ep: string) => (
                        <GraphLink key={ep} projectId={projectId} file={ep} />
                      ))}
                    </div>
                  </div>
                )}

                {activeResult.key_files?.length > 0 && (
                  <div>
                    <h4
                      style={{
                        fontSize: "var(--text-xs)",
                        color: "var(--color-text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        marginBottom: "var(--space-2)",
                      }}
                    >
                      Key Files
                    </h4>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "var(--space-2)",
                        alignItems: "flex-start",
                      }}
                    >
                      {activeResult.key_files.map((f: string) => (
                        <GraphLink key={f} projectId={projectId} file={f} />
                      ))}
                    </div>
                  </div>
                )}

                {!activeResult.entry_points?.length &&
                  !activeResult.key_files?.length && (
                    <p
                      style={{
                        color: "var(--color-text-muted)",
                        fontSize: "var(--text-sm)",
                        fontStyle: "italic",
                      }}
                    >
                      No key files identified.
                    </p>
                  )}
              </div>
            </div>

            {/* Data Models */}
            {activeResult.data_models_involved?.length > 0 && (
              <div className="panel pad">
                <h3
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    marginBottom: "var(--space-4)",
                    fontSize: "var(--text-lg)",
                  }}
                >
                  <Database
                    size={18}
                    style={{ color: "var(--color-primary)" }}
                  />{" "}
                  Data Models Involved
                </h3>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "var(--space-2)",
                  }}
                >
                  {activeResult.data_models_involved.map((model: string) => (
                    <Badge
                      key={model}
                      style={{
                        background: "var(--color-surface-2)",
                        color: "var(--color-text)",
                        fontSize: "var(--text-xs)",
                        padding: "4px 10px",
                      }}
                    >
                      {model}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
