import type { InputHTMLAttributes } from "react";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        padding: "var(--space-2) var(--space-3)",
        borderRadius: "var(--radius-md)",
        background: "var(--color-surface-2)",
        border: "1px solid var(--color-border)",
        color: "var(--color-text)",
        fontSize: "var(--text-sm)",
        ...props.style,
      }}
    />
  );
}
