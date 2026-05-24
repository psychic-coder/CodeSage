import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode };

export function Button({ children, style, ...props }: Props) {
  return (
    <button
      {...props}
      style={{
        padding: "var(--space-2) var(--space-4)",
        borderRadius: "var(--radius-md)",
        background: "var(--color-primary)",
        color: "#000",
        fontWeight: 700,
        fontSize: "var(--text-sm)",
        ...style,
      }}
    >
      {children}
    </button>
  );
}
