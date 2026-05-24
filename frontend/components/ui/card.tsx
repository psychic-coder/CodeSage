import type { ReactNode } from "react";

export function Card({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="panel" style={{ padding: "var(--space-5)", ...style }}>
      {children}
    </div>
  );
}
