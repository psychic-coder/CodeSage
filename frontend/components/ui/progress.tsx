export function Progress({ value = 0 }: { value?: number }) {
  return (
    <div style={{ height: 8, borderRadius: "var(--radius-full)", background: "var(--color-surface-offset)", overflow: "hidden" }}>
      <div style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: "100%", background: "var(--color-primary)" }} />
    </div>
  );
}
