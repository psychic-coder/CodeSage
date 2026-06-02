"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { analysisAPI } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Box,
  Link as LinkIcon,
  Activity,
  Layers,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

// --- Components ---

function SeverityPill({ value }: { value: string }) {
  const colors: Record<string, string> = {
    critical: "var(--color-error)",
    high: "var(--color-error)",
    medium: "var(--color-warning)",
    low: "var(--color-success)",
  };
  const color = colors[value?.toLowerCase()] || "var(--color-text-muted)";
  return (
    <Badge
      style={{
        background: `${color}1a`,
        color,
        border: `1px solid ${color}33`,
        textTransform: "capitalize",
      }}
    >
      {value}
    </Badge>
  );
}

function HealthRing({ score, label }: { score: number; label: string }) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;

  let color = "var(--color-success)";
  if (score < 80) color = "var(--color-warning)";
  if (score < 50) color = "var(--color-error)";

  return (
    <div
      style={{
        position: "relative",
        width: 160,
        height: 160,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width="160" height="160" style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="var(--color-surface-2)"
          strokeWidth="12"
        />
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontSize: "var(--text-3xl)",
            fontWeight: 800,
            color: "var(--color-text)",
            lineHeight: 1,
          }}
        >
          {animatedScore}
        </span>
        <span
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--color-text-muted)",
            marginTop: 4,
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

// --- Main Page ---

export default function ArchitecturePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<
    "issues" | "god_files" | "cycles" | "coupling" | "external"
  >("issues");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["architecture", projectId],
    queryFn: () => analysisAPI.architecture(projectId),
  });

  const result = useMemo(() => data?.data?.data ?? data?.data ?? null, [data]);
  const isCached = data?.data?.cached ?? false;

  const findings = result?.findings ?? {};
  const allIssues = useMemo(
    () => (Array.isArray(result?.issues) ? result.issues : []),
    [result]
  );
  const strengths = Array.isArray(result?.strengths) ? result.strengths : [];

  const circularDeps = Array.isArray(findings.circular_deps)
    ? findings.circular_deps
    : [];
  const godFiles = Array.isArray(findings.god_files) ? findings.god_files : [];
  const tightCoupling = Array.isArray(findings.tight_coupling)
    ? findings.tight_coupling
    : [];
  const externalDeps = Array.isArray(findings.external_deps)
    ? findings.external_deps
    : [];

  // Filter & Sort Issues
  const filteredIssues = useMemo(() => {
    let list = [...allIssues];
    if (severityFilter !== "all") {
      list = list.filter((i) => i.severity?.toLowerCase() === severityFilter);
    }
    const severityRank: Record<string, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };
    return list.sort(
      (a, b) =>
        (severityRank[b.severity?.toLowerCase()] || 0) -
        (severityRank[a.severity?.toLowerCase()] || 0),
    );
  }, [allIssues, severityFilter]);

  const toggleIssue = (id: string) => {
    setExpandedIssues((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await analysisAPI.architectureRefresh(projectId);
      await queryClient.invalidateQueries({
        queryKey: ["architecture", projectId],
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: "var(--space-8)" }}>
        <div
          className="skeleton"
          style={{ height: 300, borderRadius: "var(--radius-xl)" }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "var(--space-8)", color: "var(--color-error)" }}>
        Unable to load architecture analysis.
      </div>
    );
  }

  return (
    <div
      style={{ padding: "var(--space-8)", maxWidth: 1200, margin: "0 auto" }}
    >
      {/* Header & Breadcrumbs */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "var(--space-8)",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              gap: "var(--space-2)",
              marginBottom: "var(--space-4)",
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
            <span style={{ color: "var(--color-text)" }}>Architecture</span>
          </div>

          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-2xl)",
              fontWeight: 700,
              marginBottom: "var(--space-2)",
            }}
          >
            Architecture Analysis
          </h1>
          <p style={{ color: "var(--color-text-muted)" }}>
            A structured summary of coupling, cycles, and system health.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "var(--space-2)",
          }}
        >
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              padding: "var(--space-2) var(--space-4)",
              borderRadius: "var(--radius-md)",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
              cursor: isRefreshing ? "not-allowed" : "pointer",
              fontWeight: 600,
            }}
          >
            <RefreshCw
              size={16}
              className={isRefreshing ? "spin" : ""}
              style={{ color: "var(--color-primary)" }}
            />
            {isRefreshing ? "Analyzing..." : "Re-analyze"}
          </button>
          {isCached && !isRefreshing && (
            <span
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--color-text-muted)",
              }}
            >
              Showing cached result
            </span>
          )}
        </div>
      </div>

      {/* Top Panel: Score & Strengths */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr",
          gap: "var(--space-6)",
          marginBottom: "var(--space-8)",
        }}
      >
        {/* Health Panel */}
        <div
          className="panel pad"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-8)",
          }}
        >
          <HealthRing
            score={result?.overall_health_score || 0}
            label={result?.health_label || "Unknown"}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
            }}
          >
            <div>
              <p
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--color-text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Pattern
              </p>
              <p
                style={{
                  fontSize: "var(--text-lg)",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                }}
              >
                <Box size={18} style={{ color: "var(--color-primary)" }} />
                {result?.architecture_pattern || "Unknown"}
              </p>
            </div>
            <div>
              <p
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--color-text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Scalability
              </p>
              <p
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--color-text)",
                }}
              >
                {result?.scalability_assessment || "No assessment."}
              </p>
            </div>
          </div>
        </div>

        {/* Strengths Panel */}
        <div className="panel pad">
          <h2
            style={{
              fontSize: "var(--text-lg)",
              fontWeight: 600,
              marginBottom: "var(--space-4)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
            }}
          >
            <CheckCircle2 size={20} style={{ color: "var(--color-success)" }} />{" "}
            Key Strengths
          </h2>
          {strengths.length > 0 ? (
            <ul
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-3)",
                listStyle: "none",
                margin: 0,
                padding: 0,
              }}
            >
              {strengths.map((s: string, i: number) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    gap: "var(--space-3)",
                    alignItems: "flex-start",
                    fontSize: "var(--text-sm)",
                  }}
                >
                  <div
                    style={{
                      width: 4,
                      height: 16,
                      background: "var(--color-success)",
                      borderRadius: 2,
                      marginTop: 4,
                    }}
                  />
                  <span style={{ color: "var(--color-text-muted)" }}>{s}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p
              style={{
                color: "var(--color-text-muted)",
                fontSize: "var(--text-sm)",
              }}
            >
              No strengths identified.
            </p>
          )}
        </div>
      </div>

      {/* Findings Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--color-border)",
          marginBottom: "var(--space-6)",
          gap: "var(--space-6)",
          overflowX: "auto",
        }}
      >
        {[
          {
            id: "issues",
            label: "Issues",
            icon: AlertTriangle,
            count: allIssues.length,
          },
          {
            id: "god_files",
            label: "God Files",
            icon: Layers,
            count: godFiles.length,
          },
          {
            id: "cycles",
            label: "Circular Deps",
            icon: RefreshCw,
            count: circularDeps.length,
          },
          {
            id: "coupling",
            label: "Tight Coupling",
            icon: LinkIcon,
            count: tightCoupling.length,
          },
          {
            id: "external",
            label: "External Deps",
            icon: Activity,
            count: externalDeps.length,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: "var(--space-3) 0",
              background: "transparent",
              border: "none",
              borderBottom:
                activeTab === tab.id
                  ? "2px solid var(--color-primary)"
                  : "2px solid transparent",
              color:
                activeTab === tab.id
                  ? "var(--color-text)"
                  : "var(--color-text-muted)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              fontSize: "var(--text-sm)",
              fontWeight: activeTab === tab.id ? 600 : 400,
              whiteSpace: "nowrap",
            }}
          >
            <tab.icon size={16} />
            {tab.label}
            <Badge
              style={{
                background: "var(--color-surface-2)",
                color: "var(--color-text)",
              }}
            >
              {tab.count}
            </Badge>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ paddingBottom: "var(--space-12)" }}>
        {/* Issues Tab */}
        {activeTab === "issues" && (
          <div>
            <div
              style={{
                display: "flex",
                gap: "var(--space-2)",
                marginBottom: "var(--space-6)",
              }}
            >
              {["all", "critical", "high", "medium", "low"].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  style={{
                    padding: "var(--space-1) var(--space-3)",
                    borderRadius: "var(--radius-full)",
                    border: "1px solid",
                    borderColor:
                      severityFilter === sev
                        ? "var(--color-primary)"
                        : "var(--color-border)",
                    background:
                      severityFilter === sev
                        ? "var(--color-primary-highlight)"
                        : "var(--color-surface)",
                    color:
                      severityFilter === sev
                        ? "var(--color-primary)"
                        : "var(--color-text-muted)",
                    fontSize: "var(--text-xs)",
                    textTransform: "capitalize",
                    cursor: "pointer",
                  }}
                >
                  {sev}
                </button>
              ))}
            </div>

            {filteredIssues.length > 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-4)",
                }}
              >
                {filteredIssues.map((issue: any, index: number) => {
                  const id = issue.title || index.toString();
                  const isExpanded = expandedIssues.has(id);
                  return (
                    <div
                      key={id}
                      className="panel"
                      style={{ overflow: "hidden", transition: "all 0.2s" }}
                    >
                      {/* Header */}
                      <div
                        onClick={() => toggleIssue(id)}
                        style={{
                          padding: "var(--space-4)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          cursor: "pointer",
                          background: isExpanded
                            ? "var(--color-surface-2)"
                            : "var(--color-surface)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "var(--space-3)",
                          }}
                        >
                          {isExpanded ? (
                            <ChevronDown size={18} />
                          ) : (
                            <ChevronRight size={18} />
                          )}
                          <h3
                            style={{
                              fontSize: "var(--text-base)",
                              fontWeight: 600,
                            }}
                          >
                            {issue.title || "Unknown Issue"}
                          </h3>
                        </div>
                        <SeverityPill value={issue.severity || "low"} />
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div
                          style={{
                            padding: "var(--space-4)",
                            borderTop: "1px solid var(--color-border)",
                          }}
                        >
                          <p
                            style={{
                              color: "var(--color-text-muted)",
                              fontSize: "var(--text-sm)",
                              lineHeight: 1.5,
                              marginBottom: "var(--space-4)",
                            }}
                          >
                            {issue.description || issue.summary}
                          </p>

                          {issue.suggested_fix && (
                            <div
                              style={{
                                background: "var(--color-primary-highlight)",
                                borderLeft: "3px solid var(--color-primary)",
                                padding: "var(--space-3)",
                                borderRadius:
                                  "0 var(--radius-md) var(--radius-md) 0",
                                marginBottom: "var(--space-4)",
                              }}
                            >
                              <p
                                style={{
                                  fontSize: "var(--text-sm)",
                                  color: "var(--color-primary)",
                                  fontWeight: 500,
                                }}
                              >
                                Suggested Fix
                              </p>
                              <p
                                style={{
                                  fontSize: "var(--text-sm)",
                                  color: "var(--color-text)",
                                  marginTop: 4,
                                }}
                              >
                                {issue.suggested_fix}
                              </p>
                            </div>
                          )}

                          {issue.involved_files?.length > 0 && (
                            <div>
                              <p
                                style={{
                                  fontSize: "var(--text-xs)",
                                  textTransform: "uppercase",
                                  color: "var(--color-text-muted)",
                                  marginBottom: "var(--space-2)",
                                }}
                              >
                                Involved Files
                              </p>
                              <div
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: "var(--space-2)",
                                }}
                              >
                                {issue.involved_files.map((file: string) => (
                                  <Link
                                    key={file}
                                    href={`/dashboard/${projectId}/graph?focus=${encodeURIComponent(file)}`}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "var(--space-1)",
                                      padding: "4px 8px",
                                      background: "var(--color-surface-2)",
                                      border: "1px solid var(--color-border)",
                                      borderRadius: "var(--radius-md)",
                                      fontSize: "var(--text-xs)",
                                      color: "var(--color-text)",
                                      textDecoration: "none",
                                    }}
                                  >
                                    {file.split("/").pop()}
                                    <ExternalLink
                                      size={12}
                                      style={{
                                        color: "var(--color-text-muted)",
                                      }}
                                    />
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                className="panel pad"
                style={{
                  textAlign: "center",
                  color: "var(--color-text-muted)",
                }}
              >
                No issues match the selected filter.
              </div>
            )}
          </div>
        )}

        {/* God Files Tab */}
        {activeTab === "god_files" && (
          <div className="panel pad">
            <h2
              style={{
                fontSize: "var(--text-lg)",
                marginBottom: "var(--space-6)",
              }}
            >
              Highest Coupled Files
            </h2>
            {godFiles.length > 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-4)",
                }}
              >
                {godFiles.map((gf: any, idx: number) => {
                  const total = gf.in_degree + gf.out_degree;
                  const maxTotal =
                    godFiles[0].in_degree + godFiles[0].out_degree;
                  const pct = (total / maxTotal) * 100;
                  const isSevere = total > 20;

                  return (
                    <div
                      key={idx}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "300px 1fr 100px",
                        alignItems: "center",
                        gap: "var(--space-4)",
                      }}
                    >
                      <Link
                        href={`/dashboard/${projectId}/graph?focus=${encodeURIComponent(gf.path)}`}
                        title={gf.path}
                        style={{
                          fontSize: "var(--text-sm)",
                          color: "var(--color-text)",
                          textDecoration: "none",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        {gf.path.split("/").pop()}
                        <ExternalLink
                          size={12}
                          style={{ color: "var(--color-text-muted)" }}
                        />
                      </Link>
                      <div
                        style={{
                          height: 12,
                          background: "var(--color-surface-2)",
                          borderRadius: 6,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${pct}%`,
                            background: isSevere
                              ? "var(--color-error)"
                              : "var(--color-warning)",
                            borderRadius: 6,
                          }}
                        />
                      </div>
                      <div
                        style={{
                          fontSize: "var(--text-xs)",
                          color: "var(--color-text-muted)",
                          textAlign: "right",
                        }}
                      >
                        <span title="Imports">{gf.out_degree} out</span> /{" "}
                        <span title="Dependents">{gf.in_degree} in</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: "var(--color-success)" }}>
                No god files detected! 🥳
              </p>
            )}
          </div>
        )}

        {/* Circular Deps Tab */}
        {activeTab === "cycles" && (
          <div className="panel pad">
            <h2
              style={{
                fontSize: "var(--text-lg)",
                marginBottom: "var(--space-6)",
              }}
            >
              Circular Import Chains
            </h2>
            {circularDeps.length > 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-6)",
                }}
              >
                {circularDeps.map((cycle: string[], idx: number) => (
                  <div
                    key={idx}
                    style={{
                      padding: "var(--space-4)",
                      border: "1px dashed var(--color-error)",
                      borderRadius: "var(--radius-lg)",
                      background: "var(--color-surface-2)",
                      overflowX: "auto",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-2)",
                        minWidth: "max-content",
                      }}
                    >
                      {cycle.map((file, fIdx) => (
                        <div
                          key={fIdx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "var(--space-2)",
                          }}
                        >
                          <div
                            title={file}
                            style={{
                              padding: "4px 12px",
                              background: "var(--color-surface)",
                              border: "1px solid var(--color-border)",
                              borderRadius: "var(--radius-full)",
                              fontSize: "var(--text-xs)",
                              fontFamily: "monospace",
                            }}
                          >
                            {file.split("/").pop()}
                          </div>
                          {fIdx < cycle.length - 1 && (
                            <ArrowRight
                              size={14}
                              style={{ color: "var(--color-text-muted)" }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "var(--color-success)" }}>
                No circular dependencies detected! 🥳
              </p>
            )}
          </div>
        )}

        {/* Tight Coupling Tab */}
        {activeTab === "coupling" && (
          <div className="panel pad">
            <h2
              style={{
                fontSize: "var(--text-lg)",
                marginBottom: "var(--space-6)",
              }}
            >
              Bi-Directional Coupling Matrix
            </h2>
            {tightCoupling.length > 0 ? (
              <div
                style={{
                  background: "var(--color-surface)",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--color-border)",
                  overflow: "hidden",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead
                    style={{
                      background: "var(--color-surface-2)",
                      borderBottom: "1px solid var(--color-border)",
                      textAlign: "left",
                    }}
                  >
                    <tr>
                      <th
                        style={{
                          padding: "var(--space-3) var(--space-4)",
                          fontSize: "var(--text-xs)",
                          color: "var(--color-text-muted)",
                          fontWeight: 600,
                        }}
                      >
                        File A
                      </th>
                      <th
                        style={{
                          padding: "var(--space-3) var(--space-4)",
                          fontSize: "var(--text-xs)",
                          color: "var(--color-text-muted)",
                          fontWeight: 600,
                          width: 40,
                          textAlign: "center",
                        }}
                      >
                        ↔
                      </th>
                      <th
                        style={{
                          padding: "var(--space-3) var(--space-4)",
                          fontSize: "var(--text-xs)",
                          color: "var(--color-text-muted)",
                          fontWeight: 600,
                        }}
                      >
                        File B
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tightCoupling.map((pair: any, idx: number) => (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: "1px solid var(--color-border)",
                        }}
                      >
                        <td
                          style={{ padding: "var(--space-3) var(--space-4)" }}
                        >
                          <Link
                            href={`/dashboard/${projectId}/graph?focus=${encodeURIComponent(pair.file_a)}`}
                            title={pair.file_a}
                            style={{
                              fontSize: "var(--text-sm)",
                              color: "var(--color-text)",
                              textDecoration: "none",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            {pair.file_a.split("/").pop()}
                            <ExternalLink
                              size={12}
                              style={{ color: "var(--color-text-muted)" }}
                            />
                          </Link>
                        </td>
                        <td
                          style={{
                            padding: "var(--space-3) var(--space-4)",
                            textAlign: "center",
                            color: "var(--color-warning)",
                          }}
                        >
                          <RefreshCw size={14} />
                        </td>
                        <td
                          style={{ padding: "var(--space-3) var(--space-4)" }}
                        >
                          <Link
                            href={`/dashboard/${projectId}/graph?focus=${encodeURIComponent(pair.file_b)}`}
                            title={pair.file_b}
                            style={{
                              fontSize: "var(--text-sm)",
                              color: "var(--color-text)",
                              textDecoration: "none",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            {pair.file_b.split("/").pop()}
                            <ExternalLink
                              size={12}
                              style={{ color: "var(--color-text-muted)" }}
                            />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: "var(--color-success)" }}>
                No tight coupling detected! 🥳
              </p>
            )}
          </div>
        )}

        {/* External Deps Tab */}
        {activeTab === "external" && (
          <div className="panel pad">
            <h2
              style={{
                fontSize: "var(--text-lg)",
                marginBottom: "var(--space-6)",
              }}
            >
              External Package Usage
            </h2>
            {externalDeps.length > 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-4)",
                }}
              >
                {externalDeps.map((dep: any, idx: number) => {
                  const maxUsage = externalDeps[0].usage;
                  const pct = (dep.usage / maxUsage) * 100;
                  return (
                    <div
                      key={idx}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "200px 1fr 50px",
                        alignItems: "center",
                        gap: "var(--space-4)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "var(--text-sm)",
                          color: "var(--color-text)",
                          fontFamily: "monospace",
                        }}
                      >
                        {dep.name}
                      </span>
                      <div
                        style={{
                          height: 12,
                          background: "var(--color-surface-2)",
                          borderRadius: 6,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${pct}%`,
                            background: "var(--color-primary)",
                            borderRadius: 6,
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: "var(--text-xs)",
                          color: "var(--color-text-muted)",
                          textAlign: "right",
                        }}
                      >
                        {dep.usage} files
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: "var(--color-text-muted)" }}>
                No external dependencies tracked.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
