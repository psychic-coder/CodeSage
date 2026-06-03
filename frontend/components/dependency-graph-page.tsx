"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Filter, GripVertical, Layers3, Search } from "lucide-react";
import { graphAPI } from "@/lib/api";
import { normalizeList, unwrapAnalysis } from "@/lib/dashboard-ui";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

function riskColor(score: number) {
  if (score >= 0.7) return "#FB7185";
  if (score >= 0.4) return "#F59E0B";
  return "#34D399";
}

export function DependencyGraphPage({ projectId }: { projectId: string }) {
  const searchParams = useSearchParams();
  const focusParam = searchParams.get("focus");

  const [excludeTests, setExcludeTests] = useState(true);
  const [groupByDirectory, setGroupByDirectory] = useState(true);
  const [heatmapMode, setHeatmapMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState<any>(null);

  const fgRef = useRef<any>(null);

  const nodesQuery = useQuery({ queryKey: ["graph-nodes", projectId], queryFn: () => graphAPI.nodes(projectId, 0, 500) });
  const edgesQuery = useQuery({ queryKey: ["graph-edges", projectId], queryFn: () => graphAPI.edges(projectId, 0, 1000) });

  const rawNodes = normalizeList<any>(unwrapAnalysis<any>(nodesQuery.data), []);
  const rawEdges = normalizeList<any>(unwrapAnalysis<any>(edgesQuery.data), []);

  const filteredNodes = useMemo(() => {
    return rawNodes.filter((node) => {
      const path = (node.path || "").toLowerCase();
      if (excludeTests && /(test|spec)\./.test(path)) return false;
      if (searchQuery && !path.includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [rawNodes, excludeTests, searchQuery]);

  const visibleEdges = useMemo(() => {
    const paths = new Set(filteredNodes.map((node) => node.path));
    return rawEdges.filter((edge) => paths.has(edge.source) && paths.has(edge.target));
  }, [filteredNodes, rawEdges]);

  const graphData = useMemo(() => {
    return {
      nodes: filteredNodes.map((node) => ({
        ...node,
        id: node.path,
        name: node.name || node.path.split("/").pop(),
        val: Math.max(1, (node.lines_of_code || 0) / 100),
      })),
      links: visibleEdges.map((edge: any) => ({
        source: edge.source,
        target: edge.target,
      })),
    };
  }, [filteredNodes, visibleEdges]);

  useEffect(() => {
    if (focusParam && graphData.nodes.length > 0) {
      const nodeToFocus = graphData.nodes.find((n) => n.id === focusParam);
      if (nodeToFocus) {
        setSelectedNode(nodeToFocus);
        if (fgRef.current) {
          fgRef.current.centerAt(nodeToFocus.x || 0, nodeToFocus.y || 0, 1000);
          fgRef.current.zoom(8, 2000);
        }
      }
    }
  }, [focusParam, graphData.nodes]);

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node);
    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 1000);
      fgRef.current.zoom(8, 2000);
    }
  }, []);

  const nodeDetails = selectedNode
    ? {
        dependencies: visibleEdges.filter((edge) => edge.source === selectedNode.path).map((edge) => edge.target),
        dependents: visibleEdges.filter((edge) => edge.target === selectedNode.path).map((edge) => edge.source),
      }
    : null;

  return (
    <div className="relative min-h-full overflow-hidden px-5 py-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-10rem)] max-w-7xl grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <aside className="rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl z-10">
          <div className="flex items-center gap-2 text-sm text-white/70"><Filter className="h-4 w-4 text-cyan-200" /> Filters</div>
          <div className="mt-4 space-y-4">
            <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/70">
              <span>Exclude tests</span>
              <input type="checkbox" checked={excludeTests} onChange={(event) => setExcludeTests(event.target.checked)} />
            </label>
            <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/70">
              <span>Group by directory</span>
              <input type="checkbox" checked={groupByDirectory} onChange={(event) => setGroupByDirectory(event.target.checked)} />
            </label>
            <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/70">
              <span>Heatmap mode</span>
              <input type="checkbox" checked={heatmapMode} onChange={(event) => setHeatmapMode(event.target.checked)} />
            </label>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-white/35"><Search className="h-3.5 w-3.5" /> Search</div>
              <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Focus a file..." className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30" />
            </div>
          </div>

          <div className="mt-5 rounded-[24px] border border-white/10 bg-black/20 p-4 text-xs text-white/45">
            <div className="flex items-center gap-2 text-white/70"><Layers3 className="h-4 w-4 text-cyan-200" /> Layout</div>
            <p className="mt-2">The canvas uses a physics-based force-directed layout. Nodes represent files and edges represent imports.</p>
          </div>
        </aside>

        <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[#07090d] shadow-[0_20px_100px_rgba(0,0,0,0.36)] z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.12),transparent_24%)] pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:22px_22px] opacity-40 pointer-events-none" />
          
          <div className="relative h-[calc(100vh-10rem)] min-h-[760px] flex items-center justify-center">
            {nodesQuery.isLoading ? (
              <div className="flex h-full items-center justify-center text-white/45">Loading dependency graph...</div>
            ) : (
              <div className="absolute inset-0">
                <ForceGraph2D
                  ref={fgRef}
                  graphData={graphData}
                  nodeLabel="name"
                  nodeColor={(node: any) => {
                    if (selectedNode && selectedNode.id === node.id) return "#A78BFA";
                    return heatmapMode ? riskColor(node.risk_score) : "#22D3EE";
                  }}
                  nodeRelSize={4}
                  linkColor={() => "rgba(255,255,255,0.1)"}
                  linkWidth={0.5}
                  onNodeClick={handleNodeClick}
                  d3AlphaDecay={0.02}
                  d3VelocityDecay={0.3}
                />
              </div>
            )}

            <div className="pointer-events-none absolute left-5 top-5 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-white/60 backdrop-blur-xl">
              Scroll to zoom, drag to pan. Click a node to inspect its dependencies.
            </div>
          </div>
        </section>

        <aside className={`rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl z-10 transition-opacity duration-300 ${selectedNode ? "opacity-100" : "opacity-95"}`}>
          {selectedNode ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-white/70"><GripVertical className="h-4 w-4 text-cyan-200" /> Context</div>
              <div>
                <code className="block break-all rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-cyan-100">{selectedNode.path}</code>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Language", selectedNode.language || "unknown"],
                  ["LOC", selectedNode.lines_of_code ?? 0],
                  ["Complexity", selectedNode.complexity_score?.toFixed?.(1) ?? "0.0"],
                  ["Risk", `${Math.round((selectedNode.risk_score || 0) * 100)}%`],
                ].map(([label, value]) => (
                  <div key={label as string} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/35">{label}</div>
                    <div className="mt-1 text-white">{value as string}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-[0.24em] text-white/35">Direct dependencies</div>
                <div className="mt-3 max-h-40 overflow-y-auto space-y-2 text-sm text-white/70 pr-2">
                  {nodeDetails?.dependencies.length ? nodeDetails.dependencies.map((item) => <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-xs text-cyan-100 truncate" title={item}>{item.split("/").pop()}</div>) : <div className="text-white/45">None detected.</div>}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-[0.24em] text-white/35">Dependents</div>
                <div className="mt-3 max-h-40 overflow-y-auto space-y-2 text-sm text-white/70 pr-2">
                  {nodeDetails?.dependents.length ? nodeDetails.dependents.map((item) => <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-xs text-violet-100 truncate" title={item}>{item.split("/").pop()}</div>) : <div className="text-white/45">None detected.</div>}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[420px] items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-black/20 text-sm text-white/45 text-center px-4">
              Select a node to view its context.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
