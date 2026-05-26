"use client";

import React from "react";
import * as Progress from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

/* ── Types ─────────────────────────────────────────────────────────────────── */
export interface JobStep {
  label: string;
  done: boolean;
}

export interface JobProgressProps {
  /** 0–100 */
  progress: number;
  currentStep: string;
  status: "queued" | "running" | "done" | "failed";
  steps?: JobStep[];
  className?: string;
}

/* ── Status colours ─────────────────────────────────────────────────────────── */
const STATUS_META = {
  queued:  { label: "Queued",     colour: "var(--color-text-muted)", icon: "⏳" },
  running: { label: "Processing", colour: "var(--color-primary)",    icon: "⚡" },
  done:    { label: "Complete",   colour: "var(--color-success)",    icon: "✓"  },
  failed:  { label: "Failed",     colour: "var(--color-error)",      icon: "✕"  },
} as const;

/* ── Main component ─────────────────────────────────────────────────────────── */
export default function JobProgress({
  progress,
  currentStep,
  status,
  steps,
  className,
}: JobProgressProps) {
  const meta = STATUS_META[status];
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <div
      className={cn(
        "glass rounded-xl p-5 space-y-4 animate-fadeIn hover-glow",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full text-xs",
              status === "running" && "animate-pulse-glow"
            )}
            style={{ background: meta.colour + "22", color: meta.colour }}
          >
            {meta.icon}
          </span>
          <span className="text-sm font-medium" style={{ color: meta.colour }}>
            {meta.label}
          </span>
        </div>
        <span className="font-mono text-sm font-semibold" style={{ color: meta.colour }}>
          {clamped.toFixed(0)}%
        </span>
      </div>

      {/* Progress bar */}
      <Progress.Root
        className="relative h-2 w-full overflow-hidden rounded-full"
        style={{ background: "var(--color-surface-offset)" }}
        value={clamped}
      >
        <Progress.Indicator
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${clamped}%`,
            background:
              status === "failed"
                ? "var(--color-error)"
                : status === "done"
                ? "var(--color-success)"
                : "linear-gradient(90deg, var(--color-primary), var(--color-purple))",
            boxShadow:
              status === "running"
                ? "0 0 8px rgba(88,166,255,0.5)"
                : undefined,
          }}
        />
      </Progress.Root>

      {/* Current step label */}
      <p className="text-xs text-[var(--color-text-muted)] truncate">
        {currentStep || "Waiting to start…"}
      </p>

      {/* Optional step checklist */}
      {steps && steps.length > 0 && (
        <ol className="space-y-1.5 pt-1 border-t border-[var(--color-divider)]">
          {steps.map((s, i) => (
            <li key={i} className="flex items-center gap-2 text-xs">
              <span
                className={cn(
                  "h-4 w-4 rounded-full border flex items-center justify-center flex-shrink-0",
                  s.done
                    ? "border-[var(--color-success)] text-[var(--color-success)]"
                    : "border-[var(--color-border)] text-transparent"
                )}
              >
                {s.done && "✓"}
              </span>
              <span
                className={cn(
                  s.done
                    ? "text-[var(--color-text-muted)] line-through"
                    : "text-[var(--color-text)]"
                )}
              >
                {s.label}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
