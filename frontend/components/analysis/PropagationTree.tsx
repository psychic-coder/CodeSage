type TreeNode = {
  file?: string;
  path?: string;
  depth?: number;
  risk?: string;
  dependents?: TreeNode[];
};

interface Props {
  tree?: TreeNode | null;
  title?: string;
}

function TreeBranch({ node }: { node: TreeNode }) {
  const label = node.file || node.path || "Unknown file";
  return (
    <div style={{ marginLeft: node.depth ? `calc(${node.depth} * var(--space-4))` : 0, paddingLeft: node.depth ? "var(--space-4)" : 0, borderLeft: node.depth ? "1px solid var(--color-border)" : "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
        <code style={{ fontSize: "var(--text-xs)", color: "var(--color-primary)", wordBreak: "break-all" }}>{label}</code>
        {node.risk && (
          <span style={{ fontSize: "var(--text-xs)", padding: "2px 8px", borderRadius: "var(--radius-full)", background: "var(--color-warning-highlight)", color: "var(--color-warning)" }}>
            {node.risk}
          </span>
        )}
      </div>
      {node.dependents?.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {node.dependents.map((child, index) => <TreeBranch key={`${label}-${index}`} node={child} />)}
        </div>
      )}
    </div>
  );
}

export default function PropagationTree({ tree, title = "Propagation Tree" }: Props) {
  if (!tree) {
    return <div className="panel pad">No propagation data yet.</div>;
  }

  return (
    <div className="panel pad">
      <h3 style={{ marginBottom: "var(--space-4)" }}>{title}</h3>
      <TreeBranch node={tree} />
    </div>
  );
}
