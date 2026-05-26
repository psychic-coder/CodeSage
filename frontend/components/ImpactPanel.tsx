"use client";

import React from "react";
import { cn } from "@/lib/utils";

/* ── Types ─────────────────────────────────────────────────────────────────── */
export interface ImpactedFile {
  path: string;
  risk_score?: number;
  depth?: number;
  language?: string;
}

export interface ArchitectureIssue {
  title: string;
  description: string;
  severity: "high" | "medium" | "low" | "info";
  file?: string;
}

export interface ImpactPanelProps {
  targetFile?: string;
  riskScore?: number;
  riskLabel?: "High" | "Medium" | "Low";
  totalImpacted?: number;
  impactedFiles?: ImpactedFile[];
  analysis?: string;
  issues?: ArchitectureIssue[];
  onFileClick?: (path: string) => void;
  className?: string;
}

/* ── Sub-components ─────────────────────────────────────────────────────────── */
const RISK_COLOUR = {
  High:   "var(--color-error)",
  Medium: "var(--color-warning)",
  Low:    "var(--color-success)",
} as const;

const SEVERITY_META = {
  high:   { colour: "var(--color-error)",   bg: "var(--color-error-highlight)",   label: "High"   },
  medium: { colour: "var(--color-warning)", bg: "var(--color-warning-highlight)", label: "Medium" },
  low:    { colour: "var(--color-success)", bg: "var(--color-success-highlight)", label: "Low"    },
  info:   { colour: "var(--color-primary)", bg: "var(--color-primary-highlight)", label: "Info"   },
} as const;

function RiskBadge({ label, score }: { label: "High" | "Medium" | "Low"; score: number }) {
  const colour = RISK_COLOUR[label];
  return (
    <div className="flex items-center gap-3">
      <div
        className="relative flex h-14 w-14 items-center justify-center rounded-full"
        style={{
          background: colour + "22",
          border: `2px solid ${colour}55`,
          boxShadow: `0 0 16px ${colour}33`,
        }}
      >
        <span className="font-mono text-sm font-bold" style={{ color: colour }}>
          {(score * 100).toFixed(0)}
        </span>
      </div>
      <div>
        <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
          Propagation Risk
        </p>
        <p className="text-lg font-semibold" style={{ color: colour }}>
          {label}
        </p>
      </div>
    </div>
  );
}

function FileRow({ file, onClick }: { file: ImpactedFile; onClick?: (p: string) => void }) {
  const risk = file.risk_score ?? 0;
  const colour = risk >= 0.7 ? "var(--color-error)" : risk >= 0.4 ? "var(--color-warning)" : "var(--color-success)";
  const depthLabel = file.depth !== undefined ? `depth ${file.depth}` : null;

  return (
    <button
      onClick={() => onClick?.(file.path)}
      className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-150"
      style={{ background: "transparent" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-2)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {/* Risk dot */}
      <span
        className="mt-0.5 h-2 w-2 rounded-full flex-shrink-0"
        style={{ background: colour }}
      />
      {/* Path */}
      <span className="flex-1 truncate text-xs text-[var(--color-text)]">{file.path}</span>
      {/* Meta */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {depthLabel && (
          <span className="text-[10px] text-[var(--color-text-faint)]">{depthLabel}</span>
        )}
        {file.language && (
          <span className="rounded px-1 py-0.5 text-[9px] font-mono uppercase tracking-wider"
            style={{ background: "var(--color-surface-offset)", color: "var(--color-text-muted)" }}>
            {file.language}
          </span>
        )}
        <span
          className="font-mono text-[10px]"
          style={{ color: colour }}
        >
          {(risk * 100).toFixed(0)}%
        </span>
      </div>
    </button>
  );
}

function IssueCard({ issue }: { issue: ArchitectureIssue }) {
  const meta = SEVERITY_META[issue.severity];
  return (
    <div
      className="rounded-lg border p-3 space-y-1 transition-all duration-200 hover-glow"
      style={{ borderColor: meta.colour + "44", background: meta.bg }}
    >
      <div className="flex items-center gap-2">
        <span
          className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
          style={{ background: meta.colour + "33", color: meta.colour }}
        >
          {meta.label}
        </span>
        <p className="text-xs font-medium text-[var(--color-text)]">{issue.title}</p>
      </div>
      <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{issue.description}</p>
      {issue.file && (
        <p className="text-[10px] font-mono text-[var(--color-text-faint)]">{issue.file}</p>
      )}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────────────── */
export default function ImpactPanel({
  targetFile,
  riskScore = 0,
  riskLabel = "Low",
  totalImpacted = 0,
  impactedFiles = [],
  analysis,
  issues = [],
  onFileClick,
  className,
}: ImpactPanelProps) {
  const [activeTab, setActiveTab] = React.useState<"impact" | "issues">("impact");

  return (
    <aside
      className={cn(
        "glass rounded-xl flex flex-col gap-0 animate-slideIn overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="border-b border-[var(--color-divider)] p-4 space-y-3">
        {targetFile ? (
          <>
            <p className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] font-medium">
              Impact Analysis
            </p>
            <p className="text-xs font-mono text-[var(--color-primary)] truncate">{targetFile}</p>
            <RiskBadge label={riskLabel} score={riskScore} />
            <p className="text-xs text-[var(--color-text-muted)]">
              <span className="font-semibold text-[var(--color-text)]">{totalImpacted}</span> files affected by changes to this module
            </p>
          </>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)] py-2">
            Click a node in the graph to analyse its propagation impact.
          </p>
        )}
      </div>

      {/* Tabs */}
      {targetFile && (
        <div className="flex border-b border-[var(--color-divider)]">
          {(["impact", "issues"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-2.5 text-xs font-medium capitalize transition-colors duration-150"
              style={{
                color: activeTab === tab ? "var(--color-primary)" : "var(--color-text-muted)",
                borderBottom: activeTab === tab ? "2px solid var(--color-primary)" : "2px solid transparent",
                background: "transparent",
              }}
            >
              {tab === "impact" ? `Impacted Files (${impactedFiles.length})` : `Issues (${issues.length})`}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {activeTab === "impact" ? (
          impactedFiles.length > 0 ? (
            impactedFiles.map((f) => (
              <FileRow key={f.path} file={f} onClick={onFileClick} />
            ))
          ) : (
            targetFile && (
              <p className="py-6 text-center text-xs text-[var(--color-text-muted)]">
                No downstream dependents found.
              </p>
            )
          )
        ) : (
          issues.length > 0 ? (
            <div className="p-1 space-y-2">
              {issues.map((issue, i) => (
                <IssueCard key={i} issue={issue} />
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-xs text-[var(--color-text-muted)]">
              No architecture issues detected.
            </p>
          )
        )}
      </div>

      {/* LLM Analysis */}
      {analysis && activeTab === "impact" && (
        <div className="border-t border-[var(--color-divider)] p-3">
          <p className="text-[9px] uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">
            AI Analysis
          </p>
          <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{analysis}</p>
        </div>
      )}
    </aside>
  );
}
