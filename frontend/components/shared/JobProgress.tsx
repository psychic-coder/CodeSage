"use client";
import { useEffect, useState } from "react";
import { connectJobWS } from "@/lib/ws";

interface Props {
  jobId: string;
  onComplete?: () => void;
  onError?: (msg: string) => void;
}

export function JobProgress({ jobId, onComplete, onError }: Props) {
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("Initializing...");
  const [status, setStatus] = useState<"running" | "done" | "failed">("running");

  useEffect(() => {
    const disconnect = connectJobWS(jobId, (data) => {
      setProgress(data.progress ?? 0);
      if (data.current_step) setStep(data.current_step);
      if (data.status === "done" || data.progress === 100) {
        setStatus("done");
        onComplete?.();
      }
      if (data.status === "failed" || data.error) {
        setStatus("failed");
        onError?.(data.error || "Processing failed");
      }
    });
    return disconnect;
  }, [jobId, onComplete, onError]);

  return (
    <div style={{ padding: "var(--space-4)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
        <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>{step}</span>
        <span style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: status === "failed" ? "var(--color-error)" : "var(--color-primary)" }}>
          {progress}%
        </span>
      </div>
      <div style={{ height: "6px", background: "var(--color-surface-offset)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: "var(--radius-full)",
          background: status === "failed" ? "var(--color-error)" : status === "done" ? "var(--color-success)" : "var(--color-primary)",
          width: `${progress}%`, transition: "width 0.5s ease"
        }} />
      </div>
      {status === "done" && (
        <p style={{ marginTop: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--color-success)" }}>
          ✓ Processing complete
        </p>
      )}
      {status === "failed" && (
        <p style={{ marginTop: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--color-error)" }}>
          ✗ Processing failed
        </p>
      )}
    </div>
  );
}
