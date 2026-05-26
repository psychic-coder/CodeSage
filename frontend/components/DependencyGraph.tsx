"use client";

import React, { useCallback, useMemo } from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Node,
  type Edge,
  type NodeTypes,
  MarkerType,
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";
import { cn } from "@/lib/utils";

/* ── Types ─────────────────────────────────────────────────────────────────── */
export interface GraphNode {
  path: string;
  risk_score?: number;
  language?: string;
  in_degree?: number;
  out_degree?: number;
  complexity_score?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
}

interface DependencyGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick?: (node: GraphNode) => void;
  className?: string;
}

/* ── Risk helpers ───────────────────────────────────────────────────────────── */
function riskColour(score: number): string {
  if (score >= 0.7) return "#f85149"; // error red
  if (score >= 0.4) return "#d29922"; // warning amber
  return "#3fb950";                    // success green
}

function riskLabel(score: number): "High" | "Medium" | "Low" {
  if (score >= 0.7) return "High";
  if (score >= 0.4) return "Medium";
  return "Low";
}

/* ── Custom node component ──────────────────────────────────────────────────── */
const FileNode = ({ data }: { data: GraphNode & { label: string } }) => {
  const risk = data.risk_score ?? 0;
  const colour = riskColour(risk);
  const label = riskLabel(risk);

  return (
    <div
      className="relative rounded-lg border px-3 py-2 min-w-[140px] max-w-[200px] cursor-pointer transition-all duration-200 hover:scale-105"
      style={{
        background: "rgba(22, 27, 34, 0.90)",
        borderColor: colour + "55",
        boxShadow: `0 0 12px ${colour}22`,
        backdropFilter: "blur(8px)",
      }}
    >
      {/* Risk indicator bar */}
      <div
        className="absolute top-0 left-0 h-0.5 rounded-t-lg"
        style={{ width: `${risk * 100}%`, background: colour }}
      />

      {/* Language badge */}
      {data.language && (
        <span className="text-[10px] font-mono uppercase tracking-wider opacity-50 mb-1 block">
          {data.language}
        </span>
      )}

      {/* File name */}
      <p className="text-xs font-medium truncate" style={{ color: colour }}>
        {data.label}
      </p>

      {/* Risk badge */}
      <div className="flex items-center gap-1.5 mt-1.5">
        <span
          className="inline-block h-1.5 w-1.5 rounded-full flex-shrink-0"
          style={{ background: colour }}
        />
        <span className="text-[10px]" style={{ color: colour }}>
          {label} risk · {(risk * 100).toFixed(0)}%
        </span>
      </div>

      {/* Degree indicators */}
      {(data.in_degree !== undefined || data.out_degree !== undefined) && (
        <div className="flex gap-2 mt-1">
          {data.in_degree !== undefined && (
            <span className="text-[9px] text-[var(--color-text-muted)]">
              ↙ {data.in_degree}
            </span>
          )}
          {data.out_degree !== undefined && (
            <span className="text-[9px] text-[var(--color-text-muted)]">
              {data.out_degree} ↗
            </span>
          )}
        </div>
      )}
    </div>
  );
};

const nodeTypes: NodeTypes = { file: FileNode };

/* ── Layout helper – simple layered layout ──────────────────────────────────── */
function buildLayout(
  rawNodes: GraphNode[],
  rawEdges: GraphEdge[]
): { flowNodes: Node[]; flowEdges: Edge[] } {
  const COL_WIDTH = 220;
  const ROW_HEIGHT = 110;
  const PER_ROW = Math.max(4, Math.ceil(Math.sqrt(rawNodes.length)));

  const flowNodes: Node[] = rawNodes.map((n, i) => ({
    id: n.path,
    type: "file",
    position: {
      x: (i % PER_ROW) * COL_WIDTH,
      y: Math.floor(i / PER_ROW) * ROW_HEIGHT,
    },
    data: { ...n, label: n.path.split("/").pop() ?? n.path },
  }));

  const flowEdges: Edge[] = rawEdges.map((e, i) => ({
    id: `e-${i}`,
    source: e.source,
    target: e.target,
    animated: false,
    style: { stroke: "rgba(88,166,255,0.3)", strokeWidth: 1 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "rgba(88,166,255,0.4)",
      width: 12,
      height: 12,
    },
  }));

  return { flowNodes, flowEdges };
}

/* ── Main component ─────────────────────────────────────────────────────────── */
export default function DependencyGraph({
  nodes: rawNodes,
  edges: rawEdges,
  onNodeClick,
  className,
}: DependencyGraphProps) {
  const { flowNodes, flowEdges } = useMemo(
    () => buildLayout(rawNodes, rawEdges),
    [rawNodes, rawEdges]
  );

  const [nodes, , onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeClick?.(node.data as GraphNode);
    },
    [onNodeClick]
  );

  /* Legend */
  const Legend = () => (
    <div className="glass rounded-lg px-3 py-2 flex gap-4 text-xs">
      {(["High", "Medium", "Low"] as const).map((l) => {
        const colours = { High: "#f85149", Medium: "#d29922", Low: "#3fb950" };
        return (
          <span key={l} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: colours[l] }}
            />
            {l} risk
          </span>
        );
      })}
    </div>
  );

  if (!rawNodes.length) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-xl border border-[var(--color-border)] glass",
          "text-[var(--color-text-muted)] text-sm animate-fadeIn",
          className
        )}
        style={{ minHeight: 320 }}
      >
        No graph data yet — run ingestion to populate the dependency graph.
      </div>
    );
  }

  return (
    <div
      className={cn("rounded-xl overflow-hidden border border-[var(--color-border)]", className)}
      style={{ minHeight: 480, background: "var(--color-bg)" }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.1}
        maxZoom={2}
        attributionPosition="bottom-right"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="rgba(255,255,255,0.04)"
        />
        <MiniMap
          nodeColor={(n) => riskColour((n.data as GraphNode).risk_score ?? 0)}
          style={{ background: "var(--color-surface)", borderRadius: 8 }}
          maskColor="rgba(0,0,0,0.4)"
        />
        <Controls
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
          }}
        />
        <Panel position="bottom-center">
          <Legend />
        </Panel>
      </ReactFlow>
    </div>
  );
}
