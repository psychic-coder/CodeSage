"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { analysisAPI } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  Shield,
  Zap,
  GitMerge,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Code2,
  Lightbulb,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { useStreamingImprovements } from "@/hooks/useStreamingImprovements";
import { ImprovementsLoader } from "@/components/improvements/ImprovementsLoader";

// ────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────

const SEVERITY_COLOR: Record<string, string> = {
  critical: "var(--color-error)",
  high: "var(--color-error)",
  medium: "var(--color-warning)",
  low: "var(--color-success)",
};

const EFFORT_COLOR: Record<string, string> = {
  low: "var(--color-success)",
  medium: "var(--color-warning)",
  high: "var(--color-error)",
};

const CATEGORY_ICON: Record<string, any> = {
  security: Shield,
  performance: Zap,
  refactoring: GitMerge,
};

const CATEGORY_COLOR: Record<string, string> = {
  security: "#f85149",
  performance: "#f0a500",
  refactoring: "#58a6ff",
};

const COMPLEXITY_COLOR: Record<string, string> = {
  low: "var(--color-success)",
  medium: "var(--color-warning)",
  high: "var(--color-error)",
  very_high: "var(--color-error)",
};

const SEVERITY_RANK: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
const EFFORT_RANK: Record<string, number> = { low: 1, medium: 2, high: 3 };

function SeverityPill({ value }: { value: string }) {
  const color =
    SEVERITY_COLOR[value?.toLowerCase()] ?? "var(--color-text-muted)";
  return (
    <Badge
      style={{
        background: `${color}1a`,
        color,
        border: `1px solid ${color}33`,
        textTransform: "capitalize",
        fontSize: "var(--text-xs)",
      }}
    >
      {value}
    </Badge>
  );
}

function EffortPill({ value }: { value: string }) {
  const color = EFFORT_COLOR[value?.toLowerCase()] ?? "var(--color-text-muted)";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: "var(--text-xs)",
        color,
      }}
    >
      <Clock size={12} /> {value} effort
    </span>
  );
}

// ────────────────────────────────────────────────────
// Improvement Card
// ────────────────────────────────────────────────────

function ImprovementCard({
  item,
  projectId,
  isExpanded,
  onToggle,
}: {
  item: any;
  projectId: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const category = item.category?.toLowerCase() ?? "refactoring";
  const Icon = CATEGORY_ICON[category] ?? GitMerge;
  const accentColor = CATEGORY_COLOR[category] ?? CATEGORY_COLOR.refactoring;

  return (
    <article
      className="panel"
      style={{
        overflow: "hidden",
        borderLeft: `3px solid ${accentColor}`,
        transition: "box-shadow 0.2s",
      }}
    >
      {/* Card Header */}
      <div
        onClick={onToggle}
        style={{
          padding: "var(--space-4)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          cursor: "pointer",
          gap: "var(--space-4)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "var(--space-3)",
            flex: 1,
            minWidth: 0,
          }}
        >
          <div
            style={{
              padding: 8,
              borderRadius: "var(--radius-md)",
              background: `${accentColor}1a`,
              flexShrink: 0,
            }}
          >
            <Icon size={18} style={{ color: accentColor }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h3
              style={{
                fontSize: "var(--text-base)",
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              {item.title ?? item.name ?? "Untitled improvement"}
            </h3>
            <div
              style={{
                display: "flex",
                gap: "var(--space-3)",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              {item.file && (
                <Link
                  href={`/dashboard/${projectId}/graph?focus=${encodeURIComponent(item.file)}`}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--color-text-muted)",
                    fontFamily: "monospace",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {item.file.split("/").pop()}
                  {item.line_range?.[0] > 0 && (
                    <span style={{ color: "var(--color-text-faint)" }}>
                      :{item.line_range[0]}–{item.line_range[1]}
                    </span>
                  )}
                  <ExternalLink size={10} />
                </Link>
              )}
              {item.effort && <EffortPill value={item.effort} />}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            flexShrink: 0,
          }}
        >
          <SeverityPill value={item.severity ?? "low"} />
          {isExpanded ? (
            <ChevronDown
              size={18}
              style={{ color: "var(--color-text-muted)" }}
            />
          ) : (
            <ChevronRight
              size={18}
              style={{ color: "var(--color-text-muted)" }}
            />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div style={{ borderTop: "1px solid var(--color-border)" }}>
          {/* Explanation */}
          <div style={{ padding: "var(--space-4)" }}>
            <p
              style={{
                color: "var(--color-text-muted)",
                fontSize: "var(--text-sm)",
                lineHeight: 1.7,
              }}
            >
              {item.explanation ??
                item.description ??
                "No explanation provided."}
            </p>
          </div>

          {/* Code Snippet */}
          {item.code_snippet && (
            <div
              style={{
                margin: "0 var(--space-4)",
                marginBottom: "var(--space-4)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  marginBottom: "var(--space-2)",
                  fontSize: "var(--text-xs)",
                  color: "var(--color-text-muted)",
                }}
              >
                <Code2 size={14} /> Affected Code
              </div>
              <pre
                style={{
                  background: "var(--color-bg)",
                  padding: "var(--space-3)",
                  borderRadius: "var(--radius-md)",
                  fontSize: 13,
                  overflowX: "auto",
                  color: "var(--color-text)",
                  lineHeight: 1.6,
                  border: "1px solid var(--color-border)",
                  margin: 0,
                }}
              >
                <code>{item.code_snippet}</code>
              </pre>
            </div>
          )}

          {/* Suggested Fix */}
          {item.suggested_fix && (
            <div
              style={{
                margin: "0 var(--space-4)",
                marginBottom: "var(--space-4)",
                background: "var(--color-primary-highlight)",
                borderLeft: "3px solid var(--color-primary)",
                padding: "var(--space-3)",
                borderRadius: "0 var(--radius-md) var(--radius-md) 0",
              }}
            >
              <p
                style={{
                  fontSize: "var(--text-xs)",
                  fontWeight: 600,
                  color: "var(--color-primary)",
                  marginBottom: 4,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Suggested Fix
              </p>
              <p
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--color-text)",
                  lineHeight: 1.6,
                }}
              >
                {item.suggested_fix}
              </p>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

// ────────────────────────────────────────────────────
// Recommendation Card
// ────────────────────────────────────────────────────

function RecommendationCard({ item }: { item: any }) {
  const complexityColor =
    COMPLEXITY_COLOR[item.complexity?.toLowerCase()] ??
    "var(--color-text-muted)";

  return (
    <article
      className="panel pad"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "var(--space-3)",
        }}
      >
        <h3
          style={{
            fontSize: "var(--text-base)",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
          }}
        >
          <Lightbulb
            size={18}
            style={{ color: "var(--color-warning)", flexShrink: 0 }}
          />
          {item.feature ?? item.title ?? "Feature idea"}
        </h3>
        {item.complexity && (
          <Badge
            style={{
              background: `${complexityColor}1a`,
              color: complexityColor,
              border: `1px solid ${complexityColor}33`,
              textTransform: "capitalize",
              flexShrink: 0,
            }}
          >
            {item.complexity}
          </Badge>
        )}
      </div>

      <p
        style={{
          color: "var(--color-text-muted)",
          fontSize: "var(--text-sm)",
          lineHeight: 1.6,
        }}
      >
        {item.rationale ?? item.description ?? "No rationale provided."}
      </p>

      {(item.files_to_create?.length || item.files_to_modify?.length) && (
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}
        >
          {item.files_to_create?.map((f: string) => (
            <span
              key={f}
              style={{
                padding: "2px 8px",
                background: "var(--color-success-highlight)",
                color: "var(--color-success)",
                border: "1px solid var(--color-success)33",
                borderRadius: "var(--radius-full)",
                fontSize: "var(--text-xs)",
                fontFamily: "monospace",
              }}
            >
              + {f.split("/").pop()}
            </span>
          ))}
          {item.files_to_modify?.map((f: string) => (
            <span
              key={f}
              style={{
                padding: "2px 8px",
                background: "var(--color-warning)1a",
                color: "var(--color-warning)",
                border: "1px solid var(--color-warning)33",
                borderRadius: "var(--radius-full)",
                fontSize: "var(--text-xs)",
                fontFamily: "monospace",
              }}
            >
              ~ {f.split("/").pop()}
            </span>
          ))}
        </div>
      )}

      {item.dependencies_needed?.length > 0 && (
        <p
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--color-text-muted)",
          }}
        >
          Deps needed: {item.dependencies_needed.join(", ")}
        </p>
      )}
    </article>
  );
}

// ────────────────────────────────────────────────────
// Stats Bar
// ────────────────────────────────────────────────────

function StatsBar({ improvements }: { improvements: any[] }) {
  const counts = useMemo(() => {
    const result: Record<string, number> = {
      security: 0,
      performance: 0,
      refactoring: 0,
    };
    const severity: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
    for (const item of improvements) {
      const cat = item.category?.toLowerCase();
      if (cat in result) result[cat]++;
      const sev = item.severity?.toLowerCase();
      if (sev in severity) severity[sev]++;
    }
    return { category: result, severity };
  }, [improvements]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: "var(--space-4)",
        marginBottom: "var(--space-8)",
      }}
    >
      {[
        {
          label: "Security",
          key: "security",
          icon: Shield,
          color: CATEGORY_COLOR.security,
        },
        {
          label: "Performance",
          key: "performance",
          icon: Zap,
          color: CATEGORY_COLOR.performance,
        },
        {
          label: "Refactoring",
          key: "refactoring",
          icon: GitMerge,
          color: CATEGORY_COLOR.refactoring,
        },
        {
          label: "Critical / High",
          value: (counts.severity.critical ?? 0) + (counts.severity.high ?? 0),
          icon: AlertTriangle,
          color: "var(--color-error)",
        },
      ].map(({ label, key, value, icon: Icon, color }) => (
        <div
          key={label}
          className="panel pad"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-1)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
            }}
          >
            <Icon size={16} style={{ color }} />
            <span
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--color-text-muted)",
              }}
            >
              {label}
            </span>
          </div>
          <span style={{ fontSize: "var(--text-2xl)", fontWeight: 800, color }}>
            {value !== undefined ? value : (counts.category[key!] ?? 0)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────
// Main Page
// ────────────────────────────────────────────────────

export default function ImprovementsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();

  const [category, setCategory] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [effortFilter, setEffortFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"severity" | "effort">("severity");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<
    "improvements" | "recommendations"
  >("improvements");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    issues: streamedImprovements,
    status: streamStatus,
    progress: streamProgress,
    startStream,
    reset: resetStream
  } = useStreamingImprovements(projectId);

  const improvementsQuery = useQuery({
    queryKey: ["improvements", projectId],
    queryFn: () => analysisAPI.improvements(projectId),
  });
  const recommendationsQuery = useQuery({
    queryKey: ["recommendations", projectId],
    queryFn: () => analysisAPI.recommendations(projectId),
  });

  const improvements: any[] = useMemo(() => {
    if (streamedImprovements.length > 0 || streamStatus === "streaming" || streamStatus === "done") {
      return streamedImprovements;
    }
    const data =
      improvementsQuery.data?.data?.data ?? improvementsQuery.data?.data ?? [];
    return Array.isArray(data) ? data : (data.improvements ?? data.items ?? []);
  }, [improvementsQuery.data, streamedImprovements, streamStatus]);

  // Trigger stream if not cached
  useEffect(() => {
    const response = improvementsQuery.data?.data;
    if (improvementsQuery.isSuccess && response?.cached === false && streamStatus === "idle") {
      startStream();
    }
  }, [improvementsQuery.isSuccess, improvementsQuery.data, streamStatus, startStream]);

  const recommendations: any[] = useMemo(() => {
    const data =
      recommendationsQuery.data?.data?.data ??
      recommendationsQuery.data?.data ??
      [];
    const list = Array.isArray(data)
      ? data
      : (data.recommendations ?? data.items ?? []);
    // If the backend returns the wrapper object with a recommendations key inside
    if (!list.length && data?.recommendations) return data.recommendations;
    return list;
  }, [recommendationsQuery.data]);


  const filteredImprovements = useMemo(() => {
    let list = [...improvements];
    if (category) {
      list = list.filter((i) => i.category?.toLowerCase() === category.toLowerCase());
    }
    if (severityFilter !== "all") {
      list = list.filter((i) => i.severity?.toLowerCase() === severityFilter);
    }
    if (effortFilter !== "all") {
      list = list.filter((i) => i.effort?.toLowerCase() === effortFilter);
    }
    list.sort((a, b) => {
      if (sortBy === "severity") {
        return (
          (SEVERITY_RANK[b.severity?.toLowerCase()] ?? 0) -
          (SEVERITY_RANK[a.severity?.toLowerCase()] ?? 0)
        );
      }
      return (
        (EFFORT_RANK[a.effort?.toLowerCase()] ?? 0) -
        (EFFORT_RANK[b.effort?.toLowerCase()] ?? 0)
      );
    });
    return list;
  }, [improvements, category, severityFilter, effortFilter, sortBy]);

  const toggleCard = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      resetStream();
      await queryClient.invalidateQueries({
        queryKey: ["recommendations", projectId],
      });
      // Skip invalidating improvements because we stream it directly
      startStream();
      await recommendationsQuery.refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  const isLoading =
    improvementsQuery.isLoading || recommendationsQuery.isLoading;

  return (
    <div
      style={{ padding: "var(--space-8)", maxWidth: 1200, margin: "0 auto" }}
    >
      {/* Header */}
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
            <span style={{ color: "var(--color-text)" }}>Improvements</span>
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-2xl)",
              fontWeight: 700,
              marginBottom: "var(--space-2)",
            }}
          >
            Improvement Suggestions
          </h1>
          <p style={{ color: "var(--color-text-muted)" }}>
            Prioritized security, performance, and refactoring opportunities.
          </p>
        </div>

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
            flexShrink: 0,
          }}
        >
          <RefreshCw
            size={16}
            style={{
              color: "var(--color-primary)",
              animation: isRefreshing ? "spin 1s linear infinite" : "none",
            }}
          />
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Stats Bar */}
      {!isLoading && improvements.length > 0 && (
        <StatsBar improvements={improvements} />
      )}

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--color-border)",
          marginBottom: "var(--space-6)",
          gap: "var(--space-6)",
        }}
      >
        {[
          {
            id: "improvements",
            label: "Improvements",
            icon: AlertTriangle,
            count: improvements.length,
          },
          {
            id: "recommendations",
            label: "Recommended Features",
            icon: Sparkles,
            count: recommendations.length,
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

      {/* Improvements Tab */}
      {activeTab === "improvements" && (
        <div>
          {/* Toolbar */}
          <div
            style={{
              display: "flex",
              gap: "var(--space-4)",
              marginBottom: "var(--space-6)",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {/* Category Filter */}
            <div
              style={{
                display: "flex",
                gap: "var(--space-2)",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--color-text-muted)",
                  flexShrink: 0,
                }}
              >
                Category
              </span>
              {[
                {
                  value: "",
                  label: "All",
                  icon: null,
                  color: "var(--color-text-muted)",
                },
                {
                  value: "security",
                  label: "Security",
                  icon: Shield,
                  color: CATEGORY_COLOR.security,
                },
                {
                  value: "performance",
                  label: "Performance",
                  icon: Zap,
                  color: CATEGORY_COLOR.performance,
                },
                {
                  value: "refactoring",
                  label: "Refactoring",
                  icon: GitMerge,
                  color: CATEGORY_COLOR.refactoring,
                },
              ].map(({ value, label, icon: Icon, color }) => (
                <button
                  key={value || "all"}
                  onClick={() => setCategory(value)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "4px 12px",
                    borderRadius: "var(--radius-full)",
                    border: `1px solid ${category === value ? color : "var(--color-border)"}`,
                    background:
                      category === value ? `${color}1a` : "transparent",
                    color:
                      category === value ? color : "var(--color-text-muted)",
                    fontSize: "var(--text-xs)",
                    cursor: "pointer",
                  }}
                >
                  {Icon && <Icon size={12} />} {label}
                </button>
              ))}
            </div>

            {/* Severity Filter */}
            <div
              style={{
                display: "flex",
                gap: "var(--space-2)",
                alignItems: "center",
                marginLeft: "auto",
              }}
            >
              <span
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--color-text-muted)",
                }}
              >
                Severity
              </span>
              {["all", "critical", "high", "medium", "low"].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  style={{
                    padding: "2px 10px",
                    borderRadius: "var(--radius-full)",
                    border: `1px solid ${severityFilter === sev ? "var(--color-primary)" : "var(--color-border)"}`,
                    background:
                      severityFilter === sev
                        ? "var(--color-primary-highlight)"
                        : "transparent",
                    color:
                      severityFilter === sev
                        ? "var(--color-primary)"
                        : "var(--color-text-muted)",
                    fontSize: "var(--text-xs)",
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {sev}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div
              style={{
                display: "flex",
                gap: "var(--space-2)",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--color-text-muted)",
                }}
              >
                Sort
              </span>
              {(["severity", "effort"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  style={{
                    padding: "2px 10px",
                    borderRadius: "var(--radius-full)",
                    border: `1px solid ${sortBy === s ? "var(--color-primary)" : "var(--color-border)"}`,
                    background:
                      sortBy === s
                        ? "var(--color-primary-highlight)"
                        : "transparent",
                    color:
                      sortBy === s
                        ? "var(--color-primary)"
                        : "var(--color-text-muted)",
                    fontSize: "var(--text-xs)",
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Card List */}
          {improvementsQuery.isLoading && streamStatus === "idle" ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-4)",
              }}
            >
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="skeleton"
                  style={{ height: 80, borderRadius: "var(--radius-lg)" }}
                />
              ))}
            </div>
          ) : streamStatus === "streaming" && filteredImprovements.length === 0 ? (
            <ImprovementsLoader 
              batch={streamProgress.batch} 
              totalBatches={streamProgress.totalBatches}
              itemsFound={0} 
            />
          ) : filteredImprovements.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-4)",
              }}
            >
              {streamStatus === "streaming" && (
                <div style={{ marginBottom: "var(--space-4)" }}>
                   <ImprovementsLoader 
                      batch={streamProgress.batch} 
                      totalBatches={streamProgress.totalBatches}
                      itemsFound={filteredImprovements.length} 
                   />
                </div>
              )}
              {filteredImprovements.map((item: any, index: number) => {
                const id = item.id ?? `${item.file}-${item.title}-${index}`;
                return (
                  <ImprovementCard
                    key={id}
                    item={item}
                    projectId={projectId}
                    isExpanded={expandedIds.has(id)}
                    onToggle={() => toggleCard(id)}
                  />
                );
              })}
            </div>
          ) : (
            <div
              className="panel pad"
              style={{ textAlign: "center", color: "var(--color-text-muted)" }}
            >
              {streamStatus === "error" ? "An error occurred while fetching improvements." : "No improvements match the selected filters."}
            </div>
          )}
        </div>
      )}

      {/* Recommendations Tab */}
      {activeTab === "recommendations" && (
        <div>
          {recommendationsQuery.isLoading ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "var(--space-4)",
              }}
            >
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="skeleton"
                  style={{ height: 160, borderRadius: "var(--radius-lg)" }}
                />
              ))}
            </div>
          ) : recommendations.length > 0 ? (
            <>
              {/* Detected domain banner */}
              {recommendationsQuery.data?.data?.data?.detected_domain && (
                <div
                  style={{
                    padding: "var(--space-3) var(--space-4)",
                    background: "var(--color-primary-highlight)",
                    border: "1px solid var(--color-primary)33",
                    borderRadius: "var(--radius-md)",
                    marginBottom: "var(--space-6)",
                    fontSize: "var(--text-sm)",
                    color: "var(--color-text)",
                  }}
                >
                  <span style={{ color: "var(--color-text-muted)" }}>
                    Detected domain:{" "}
                  </span>
                  <strong style={{ textTransform: "capitalize" }}>
                    {recommendationsQuery.data.data.data.detected_domain}
                  </strong>
                </div>
              )}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                  gap: "var(--space-4)",
                }}
              >
                {recommendations.map((item: any, index: number) => (
                  <RecommendationCard key={item.feature ?? index} item={item} />
                ))}
              </div>
            </>
          ) : (
            <div
              className="panel pad"
              style={{ textAlign: "center", color: "var(--color-text-muted)" }}
            >
              No recommendations were returned.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
