type Props = {
  title: string;
  subtitle?: string;
};

export default function NodeTooltip({ title, subtitle }: Props) {
  return (
    <div className="panel pad" style={{ maxWidth: 280 }}>
      <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, marginBottom: subtitle ? "var(--space-1)" : 0 }}>{title}</div>
      {subtitle && <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", wordBreak: "break-word" }}>{subtitle}</div>}
    </div>
  );
}
