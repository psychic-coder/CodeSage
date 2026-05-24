import type { ReactNode } from "react";

export function Card({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="panel" style={{ padding: "var(--space-5)", ...style }}>
      {children}
    </div>
  );
}import type { ReactNode } from "react";

export function Card({ children }: { children: ReactNode }) {
  return <div className="panel pad">{children}</div>;
}
