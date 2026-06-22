import { Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ImprovementsLoaderProps {
  batch: number;
  totalBatches: number;
  itemsFound: number;
}

export function ImprovementsLoader({
  batch,
  totalBatches,
  itemsFound,
}: ImprovementsLoaderProps) {
  // If we don't know total batches yet, just show a spinning state
  const percent = totalBatches > 0 ? Math.min(100, Math.round(((batch - 1) / totalBatches) * 100)) : 0;
  
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6)",
        padding: "var(--space-8)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Animated shimmer background */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "linear-gradient(90deg, transparent, var(--color-surface-2), transparent)",
          backgroundSize: "200% 100%",
          animation: "shimmer 2s infinite linear",
          opacity: 0.3,
          pointerEvents: "none",
        }}
      />
      
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.5; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", position: "relative", zIndex: 1 }}>
        <div style={{ position: "relative" }}>
          <div
            style={{
              position: "absolute",
              inset: -8,
              borderRadius: "50%",
              border: "2px solid var(--color-primary)",
              animation: "pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite",
            }}
          />
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "var(--color-primary-highlight)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-primary)",
            }}
          >
            <Sparkles size={24} />
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <h3
            style={{
              fontSize: "var(--text-lg)",
              fontWeight: 600,
              color: "var(--color-text)",
              marginBottom: 4,
            }}
          >
            AI is reviewing your codebase...
          </h3>
          <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>
            {totalBatches > 0 
              ? `Analysing batch ${Math.max(1, batch)} of ${totalBatches}. High-risk files are prioritised.`
              : "Fetching repository context and preparing analysis batches..."}
          </p>
        </div>

        <div style={{ textAlign: "right" }}>
          <Badge
            style={{
              background: "var(--color-success)22",
              color: "var(--color-success)",
              border: "1px solid var(--color-success)44",
              fontSize: "var(--text-lg)",
              padding: "4px 12px",
            }}
          >
            {itemsFound} found
          </Badge>
        </div>
      </div>

      {totalBatches > 0 && (
        <div style={{ position: "relative", zIndex: 1, marginTop: "var(--space-2)" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "var(--text-xs)",
              color: "var(--color-text-muted)",
              marginBottom: 8,
              fontWeight: 500,
            }}
          >
            <span>Progress</span>
            <span>{percent}%</span>
          </div>
          <div
            style={{
              height: 6,
              background: "var(--color-surface-2)",
              borderRadius: "var(--radius-full)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                background: "var(--color-primary)",
                width: `${percent}%`,
                transition: "width 0.5s ease-out",
                borderRadius: "var(--radius-full)",
              }}
            />
          </div>
        </div>
      )}

      {/* Skeleton cards to indicate loading content */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginTop: "var(--space-4)", position: "relative", zIndex: 1 }}>
        {[1, 2].map((i) => (
          <div
            key={i}
            style={{
              height: 70,
              background: "var(--color-surface-2)",
              borderRadius: "var(--radius-md)",
              opacity: 0.5 - (i * 0.2), // Fade out
            }}
          />
        ))}
      </div>
    </div>
  );
}
