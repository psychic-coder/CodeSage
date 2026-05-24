import type { ReactNode } from "react";

export function Badge({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <span style={{ padding: "2px 8px", borderRadius: "var(--radius-full)", background: "var(--color-primary-highlight)", color: "var(--color-primary)", fontSize: "var(--text-xs)", ...style }}>
      {children}
    </span>
  );
}import type { ReactNode } from "react";

export function Badge({ children }: { children: ReactNode }) {
  return <span className="badge">{children}</span>;
}
