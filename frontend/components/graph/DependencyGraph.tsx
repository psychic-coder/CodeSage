"use client";
import { useMemo, useState } from "react";
import ReactFlow, { Background, Controls, MiniMap, Handle, Position, type Node, type Edge, type NodeTypes } from "reactflow";
import "reactflow/dist/style.css";
import type { GraphEdge, GraphNode } from "@/types";

type Props = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

function riskColor(score: number) {
  if (score >= 0.7) return "#f85149";
  if (score >= 0.4) return "#d29922";
  return "#3fb950";
}

function FileNode({ data }: { data: GraphNode }) {
  return (
    <div style={{ padding: "var(--space-2) var(--space-3)", minWidth: 160, borderRadius: "var(--radius-md)", background: "var(--color-surface)", border: `1px solid ${riskColor(data.risk_score || 0)}` }}>
      <Handle type="target" position={Position.Top} style={{ background: "var(--color-primary)" }} />
      <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, wordBreak: "break-word" }}>{data.name || data.path}</div>
      <div style={{ fontSize: "10px", color: "var(--color-text-muted)", marginTop: 2 }}>{data.language}</div>
      <Handle type="source" position={Position.Bottom} style={{ background: "var(--color-primary)" }} />
    </div>
  );
}

const nodeTypes: NodeTypes = { file: FileNode as never };

export default function DependencyGraph({ nodes, edges }: Props) {
  const [selected, setSelected] = useState<GraphNode | null>(null);

  const flowNodes: Node[] = useMemo(() => nodes.map((node, index) => ({
    id: node.path,
    type: "file",
    position: { x: (index % 4) * 220, y: Math.floor(index / 4) * 140 },
    data: node,
  })), [nodes]);

  const flowEdges: Edge[] = useMemo(() => edges.map((edge, index) => ({
    id: `${edge.source}-${edge.target}-${index}`,
    source: edge.source,
    target: edge.target,
    style: { stroke: "var(--color-border)" },
  })), [edges]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 280px", gap: "var(--space-4)", minHeight: 560 }}>
      <div className="panel" style={{ minHeight: 560, overflow: "hidden" }}>
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          fitView
          onNodeClick={(_, node) => setSelected(nodes.find((item) => item.path === node.id) ?? null)}
        >
          <MiniMap nodeColor={(node) => riskColor((node.data as GraphNode).risk_score || 0)} />
          <Controls />
          <Background />
        </ReactFlow>
      </div>
      <div className="panel pad">
        {selected ? (
          <>
            <h3 style={{ marginBottom: "var(--space-3)" }}>{selected.name}</h3>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", wordBreak: "break-all" }}>{selected.path}</p>
            <div style={{ marginTop: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-2)", fontSize: "var(--text-sm)" }}>
              <div>Language: {selected.language}</div>
              <div>LOC: {selected.lines_of_code}</div>
              <div>Complexity: {selected.complexity_score}</div>
              <div>Risk: {(selected.risk_score * 100).toFixed(0)}%</div>
            </div>
          </>
        ) : (
          <p>Select a node to inspect it.</p>
        )}
      </div>
    </div>
  );
}
