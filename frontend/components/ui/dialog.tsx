import type { ReactNode } from "react";

export function Dialog({ children, open = true }: { children: ReactNode; open?: boolean }) {
  if (!open) return null;
  return <div className="panel pad">{children}</div>;
}
