"use client";
import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { graphAPI } from "@/lib/api";
import type { GraphNode, GraphEdge } from "@/types";
import ReactFlow, {
  MiniMap, Controls, Background,
  Node, Edge, NodeTypes, useNodesState, useEdgesState,
  Handle, Position, BackgroundVariant
} from "reactflow";
import "reactflow/dist/style.css";

function riskColor(score: number) {
  if (score >= 0.7) return "#f85149";
  if (score >= 0.4) return "#d29922";
  return "#3fb950";
}

function FileNode({ data }: { data: any }) {
  return (
    <div style={{
      padding: "6px 10px", borderRadius: "6px",
      background: "var(--color-surface-2)",
      border: `2px solid ${riskColor(data.risk_score || 0)}`,
      fontSize: "11px", maxWidth: "160px",
      color: "var(--color-text)", fontFamily: "monospace"
    }}>
      <Handle type="target" position={Position.Top} style={{ background: "var(--color-border)" }} />
      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>{data.label}</div>
      {data.language && <div style={{ color: "var(--color-text-faint)", marginTop: 2 }}>{data.language}</div>}
      <Handle type="source" position={Position.Bottom} style={{ background: "var(--color-border)" }} />
    </div>
  );
}

const nodeTypes: NodeTypes = { file: FileNode };

export default function GraphPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [filterLang, setFilterLang] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: nodesData, isLoading: nodesLoading } = useQuery({
    queryKey: ["graph-nodes", projectId],
    queryFn: () => graphAPI.nodes(projectId, 0, 300),
  });
  const { data: edgesData, isLoading: edgesLoading } = useQuery({
    queryKey: ["graph-edges", projectId],
    queryFn: () => graphAPI.edges(projectId, 0, 1000),
  });

  const rawNodes: GraphNode[] = useMemo(() => nodesData?.data ?? [], [nodesData]);
  const rawEdges: GraphEdge[] = useMemo(() => edgesData?.data ?? [], [edgesData]);

  const filtered = useMemo(() => {
    let nodes = rawNodes;
    if (filterLang) nodes = nodes.filter(n => n.language === filterLang);
    if (searchQuery) nodes = nodes.filter(n => n.path.toLowerCase().includes(searchQuery.toLowerCase()));
    return nodes;
  }, [rawNodes, filterLang, searchQuery]);

  const filteredPaths = useMemo(() => new Set(filtered.map(n => n.path)), [filtered]);

  const flowNodes: Node[] = useMemo(() => filtered.map((n, i) => ({
    id: n.path, type: "file",
    position: { x: (i % 15) * 200, y: Math.floor(i / 15) * 120 },
    data: { ...n, label: n.name || n.path.split("/").pop(), risk_score: n.risk_score },
  })), [filtered]);

  const flowEdges: Edge[] = useMemo(() => rawEdges
    .filter(e => filteredPaths.has(e.source) && filteredPaths.has(e.target))
    .map((e, i) => ({
      id: `e${i}`, source: e.source, target: e.target,
      style: { stroke: "var(--color-border)", strokeOpacity: 0.5 },
      animated: false
    })), [rawEdges, filteredPaths]);

  const [nodes, , onNodesChange] = useNodesState(flowNodes);
  const [edges, , onEdgesChange] = useEdgesState(flowEdges);

  const languages = useMemo(() => Array.from(new Set(rawNodes.map(n => n.language).filter(Boolean))), [rawNodes]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    const raw = rawNodes.find(n => n.path === node.id);
    if (raw) setSelectedNode(raw);
  }, [rawNodes]);

  const isLoading = nodesLoading || edgesLoading;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
      <div style={{
        padding: "var(--space-3) var(--space-4)", borderBottom: "1px solid var(--color-border)",
        background: "var(--color-surface)", display: "flex", alignItems: "center", gap: "var(--space-4)", flexWrap: "wrap"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
          <Link href="/dashboard" style={{ color: "var(--color-text-muted)", textDecoration: "none" }}>Projects</Link>
          <span>/</span>
          <Link href={`/dashboard/${projectId}`} style={{ color: "var(--color-text-muted)", textDecoration: "none" }}>Overview</Link>
          <span>/</span>
          <span style={{ color: "var(--color-text)" }}>Dependency Graph</span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
          <input
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            style={{
              padding: "var(--space-1) var(--space-3)", borderRadius: "var(--radius-md)",
              background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
              color: "var(--color-text)", fontSize: "var(--text-xs)", outline: "none"
            }}
          />
          <select value={filterLang} onChange={e => setFilterLang(e.target.value)} style={{
            padding: "var(--space-1) var(--space-3)", borderRadius: "var(--radius-md)",
            background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
            color: "var(--color-text)", fontSize: "var(--text-xs)", outline: "none"
          }}>
            <option value="">All Languages</option>
            {languages.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", position: "relative", overflow: "hidden" }}>
        {isLoading ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 40, height: 40, border: "3px solid var(--color-surface-offset)", borderTop: "3px solid var(--color-primary)", borderRadius: "50%", marginInline: "auto", marginBottom: "var(--space-4)" }} className="animate-spin" />
              <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>Loading dependency graph...</p>
            </div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            style={{ background: "var(--color-bg)" }}
            minZoom={0.1} maxZoom={3}
          >
            <MiniMap
              style={{ background: "var(--color-surface)" }}
              nodeColor={(n: any) => riskColor(n.data?.risk_score || 0)}
            />
            <Controls />
            <Background variant={BackgroundVariant.Dots} color="var(--color-border)" />
          </ReactFlow>
        )}

        {selectedNode && (
          <div style={{
            position: "absolute", right: 0, top: 0, bottom: 0, width: "320px",
            background: "var(--color-surface)", borderLeft: "1px solid var(--color-border)",
            padding: "var(--space-5)", overflowY: "auto"
          }} className="animate-fadeIn">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
              <h3 style={{ fontSize: "var(--text-sm)", fontWeight: 700 }}>File Details</h3>
              <button onClick={() => setSelectedNode(null)} style={{ color: "var(--color-text-muted)" }}>✕</button>
            </div>
            <code style={{ display: "block", fontSize: "var(--text-xs)", color: "var(--color-primary)", wordBreak: "break-all", marginBottom: "var(--space-4)", fontFamily: "monospace" }}>{selectedNode.path}</code>
            {[
              { label: "Language", value: selectedNode.language },
              { label: "Lines of Code", value: selectedNode.lines_of_code },
              { label: "Complexity Score", value: selectedNode.complexity_score?.toFixed(1) },
              { label: "Size", value: `${(selectedNode.size_bytes / 1024).toFixed(1)} KB` },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "var(--space-2) 0", borderBottom: "1px solid var(--color-divider)" }}>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>{label}</span>
                <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, fontFamily: label === "Language" ? "inherit" : "monospace" }}>{value ?? "—"}</span>
              </div>
            ))}
            <div style={{ marginTop: "var(--space-4)" }}>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>Risk Score</p>
              <div style={{ height: 6, background: "var(--color-surface-offset)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: "var(--radius-full)",
                  background: riskColor(selectedNode.risk_score || 0),
                  width: `${(selectedNode.risk_score || 0) * 100}%`
                }} />
              </div>
              <span style={{ fontSize: "var(--text-xs)", color: riskColor(selectedNode.risk_score || 0), marginTop: "var(--space-1)", display: "block" }}>
                {((selectedNode.risk_score || 0) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        )}
      </div>

      <div style={{
        padding: "var(--space-2) var(--space-4)", borderTop: "1px solid var(--color-border)",
        background: "var(--color-surface)", display: "flex", gap: "var(--space-6)", flexWrap: "wrap",
        fontSize: "var(--text-xs)", color: "var(--color-text-muted)"
      }}>
        <span>Legend</span>
        <span><span style={{ color: "#3fb950" }}>●</span> Low risk</span>
        <span><span style={{ color: "#d29922" }}>●</span> Medium risk</span>
        <span><span style={{ color: "#f85149" }}>●</span> High risk</span>
      </div>
    </div>
  );
}
