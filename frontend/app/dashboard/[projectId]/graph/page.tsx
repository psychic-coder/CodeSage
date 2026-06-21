"use client";
import { useCallback, useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { graphAPI, analysisAPI } from "@/lib/api";
import type { GraphNode, GraphEdge } from "@/types";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  Node,
  Edge,
  NodeTypes,
  Handle,
  Position,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import dagre from "@dagrejs/dagre";
import { toPng } from "html-to-image";

function riskColor(score: number) {
  if (score >= 0.7) return "#f85149";
  if (score >= 0.4) return "#d29922";
  return "#3fb950";
}

function FileNode({ data }: { data: any }) {
  const risk = data.risk_score || 0;
  const nodeSize = Math.max(
    120,
    Math.min(220, 120 + (data.in_degree || 0) * 8),
  );

  let bg = "var(--color-surface-2)";
  let borderColor = riskColor(risk);
  let pulse = "";
  let borderStyle = "solid";

  if (data.heatmapMode) {
    const hue = 120 - risk * 120;
    bg = `hsla(${hue}, 70%, 25%, 0.8)`;
  }

  if (data.impacted) {
    borderColor = risk >= 0.7 ? "var(--color-error)" : "var(--color-warning)";
    bg = risk >= 0.7 ? "rgba(248,81,73,0.15)" : "rgba(210,153,34,0.15)";
    pulse = "animate-pulse-glow";
  }

  if (data.isCycle) {
    borderColor = "var(--color-purple)";
    borderStyle = "dashed";
  }

  if (data.isIsolated) {
    borderColor = "var(--color-text-faint)";
    borderStyle = "dashed";
  }

  return (
    <div
      className={pulse}
      style={{
        padding: "6px 10px",
        borderRadius: "10px",
        background: bg,
        border: `2px ${borderStyle} ${borderColor}`,
        fontSize: "11px",
        maxWidth: `${nodeSize}px`,
        minWidth: `${nodeSize}px`,
        color: "var(--color-text)",
        fontFamily: "monospace",
        boxShadow: data.impacted ? `0 0 10px ${borderColor}` : "none",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontWeight: 600,
        }}
      >
        {data.isCycle && (
          <span style={{ marginRight: 4 }} title="In circular dependency">
            ♻️
          </span>
        )}
        {data.label}
      </div>
      {data.language && (
        <div style={{ color: "var(--color-text-faint)", marginTop: 2 }}>
          {data.language}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

function DirNode({ data }: { data: any }) {
  return (
    <div
      style={{
        padding: "10px",
        borderRadius: "8px",
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        minWidth: 150,
        textAlign: "center",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div style={{ fontSize: 24 }}>📁</div>
      <div style={{ fontWeight: "bold", fontSize: 14 }}>{data.label}</div>
      <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
        {data.count} files
      </div>
      <div
        style={{
          height: 4,
          background: riskColor(data.avgRisk),
          borderRadius: 2,
          width: "100%",
        }}
      />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

const nodeTypes: NodeTypes = { file: FileNode, dir: DirNode };

const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  direction: string = "TB",
) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, nodesep: 60, ranksep: 100 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 220, height: 80 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: direction === "TB" ? Position.Top : Position.Left,
      sourcePosition: direction === "TB" ? Position.Bottom : Position.Right,
      position: {
        x: nodeWithPosition.x - 220 / 2,
        y: nodeWithPosition.y - 80 / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

function GraphPageContent() {
  const { projectId } = useParams<{ projectId: string }>();
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Filters
  const [filterLang, setFilterLang] = useState("");
  const [filterRisk, setFilterRisk] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchFocusIdx, setSearchFocusIdx] = useState(-1);
  const [focusDepth, setFocusDepth] = useState(2);
  const [showIsolatedOnly, setShowIsolatedOnly] = useState(false);
  const [showCyclesOnly, setShowCyclesOnly] = useState(false);

  // Layout & View modes
  const [layoutDir, setLayoutDir] = useState<"TB" | "LR">("TB");
  const [heatmapMode, setHeatmapMode] = useState(false);
  const [groupByDir, setGroupByDir] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  // Propagation state
  const [propagationData, setPropagationData] = useState<any>(null);
  const [propagationLoading, setPropagationLoading] = useState(false);
  const [impactedPaths, setImpactedPaths] = useState<Set<string>>(new Set());

  const { fitView, setCenter } = useReactFlow();

  const { data: nodesData, isLoading: nodesLoading } = useQuery({
    queryKey: ["graph-nodes", projectId],
    queryFn: () => graphAPI.nodes(projectId, 0, 1000),
  });
  const { data: edgesData, isLoading: edgesLoading } = useQuery({
    queryKey: ["graph-edges", projectId],
    queryFn: () => graphAPI.edges(projectId, 0, 5000),
  });
  const { data: cyclesData } = useQuery({
    queryKey: ["graph-cycles", projectId],
    queryFn: () => graphAPI.cycles(projectId),
  });

  const rawNodes: GraphNode[] = useMemo(
    () => nodesData?.data ?? [],
    [nodesData],
  );
  const rawEdges: GraphEdge[] = useMemo(
    () => edgesData?.data ?? [],
    [edgesData],
  );

  // Flatten cycles into a Set of paths
  const cyclePaths = useMemo(() => {
    const paths = new Set<string>();
    if (cyclesData?.data) {
      cyclesData.data.forEach((cycle: string[]) => {
        cycle.forEach((p) => paths.add(p));
      });
    }
    return paths;
  }, [cyclesData]);

  const isolatedPaths = useMemo(() => {
    return new Set(
      rawNodes
        .filter((n) => n.in_degree === 0 && n.out_degree === 0)
        .map((n) => n.path),
    );
  }, [rawNodes]);

  const filtered = useMemo(() => {
    let nodes = rawNodes;
    if (filterLang) nodes = nodes.filter((n) => n.language === filterLang);
    if (filterRisk) {
      if (filterRisk === "high")
        nodes = nodes.filter((n) => n.risk_score >= 0.7);
      else if (filterRisk === "medium")
        nodes = nodes.filter((n) => n.risk_score >= 0.4 && n.risk_score < 0.7);
      else if (filterRisk === "low")
        nodes = nodes.filter((n) => n.risk_score < 0.4);
    }
    if (searchQuery)
      nodes = nodes.filter((n) =>
        n.path.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    if (showIsolatedOnly)
      nodes = nodes.filter((n) => isolatedPaths.has(n.path));
    if (showCyclesOnly) nodes = nodes.filter((n) => cyclePaths.has(n.path));
    return nodes;
  }, [
    rawNodes,
    filterLang,
    filterRisk,
    searchQuery,
    showIsolatedOnly,
    showCyclesOnly,
    isolatedPaths,
    cyclePaths,
  ]);

  const filteredPaths = useMemo(
    () => new Set(filtered.map((n) => n.path)),
    [filtered],
  );

  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    return rawNodes
      .filter((n) => n.path.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, 8);
  }, [searchQuery, rawNodes]);

  const neighborhoodPaths = useMemo(() => {
    if (!selectedNode) return filteredPaths;
    const adjacency = new Map<string, Set<string>>();
    const reverseAdjacency = new Map<string, Set<string>>();
    for (const edge of rawEdges) {
      if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set());
      if (!reverseAdjacency.has(edge.target))
        reverseAdjacency.set(edge.target, new Set());
      adjacency.get(edge.source)!.add(edge.target);
      reverseAdjacency.get(edge.target)!.add(edge.source);
    }
    const visited = new Set<string>([selectedNode.path]);
    let frontier = new Set<string>([selectedNode.path]);
    for (let depth = 0; depth < focusDepth; depth += 1) {
      const next = new Set<string>();
      for (const path of frontier) {
        for (const neighbor of adjacency.get(path) || [])
          if (!visited.has(neighbor)) next.add(neighbor);
        for (const neighbor of reverseAdjacency.get(path) || [])
          if (!visited.has(neighbor)) next.add(neighbor);
      }
      next.forEach((path) => visited.add(path));
      frontier = next;
      if (!frontier.size) break;
    }
    return visited;
  }, [selectedNode, rawEdges, filteredPaths, focusDepth]);

  const visibleNodes = useMemo(
    () =>
      selectedNode
        ? filtered.filter((n) => neighborhoodPaths.has(n.path))
        : filtered,
    [filtered, selectedNode, neighborhoodPaths],
  );

  // Handle Grouping and Layout
  const { nodes: flowNodes, edges: flowEdges } = useMemo(() => {
    let finalNodes: Node[] = [];
    let finalEdges: Edge[] = [];

    if (groupByDir) {
      const dirMap = new Map<string, GraphNode[]>();
      visibleNodes.forEach((n) => {
        const parts = n.path.split("/");
        const dir = parts.length > 1 ? parts.slice(0, -1).join("/") : "/";
        if (!dirMap.has(dir)) dirMap.set(dir, []);
        dirMap.get(dir)!.push(n);
      });

      const nodeToDir = new Map<string, string>();
      dirMap.forEach((nodes, dir) => {
        if (expandedDirs.has(dir)) {
          nodes.forEach((n) => {
            nodeToDir.set(n.path, n.path);
            finalNodes.push({
              id: n.path,
              type: "file",
              position: { x: 0, y: 0 },
              data: {
                ...n,
                label: n.name || n.path.split("/").pop(),
                risk_score: n.risk_score,
                heatmapMode,
                impacted: impactedPaths.has(n.path),
                isCycle: cyclePaths.has(n.path),
                isIsolated: isolatedPaths.has(n.path),
              },
            });
          });
        } else {
          const avgRisk =
            nodes.reduce((acc, n) => acc + (n.risk_score || 0), 0) /
            nodes.length;
          nodes.forEach((n) => nodeToDir.set(n.path, dir));
          finalNodes.push({
            id: dir,
            type: "dir",
            position: { x: 0, y: 0 },
            data: { label: dir, count: nodes.length, avgRisk, isDir: true },
          });
        }
      });

      const addedEdges = new Set<string>();
      rawEdges.forEach((e) => {
        if (
          neighborhoodPaths.has(e.source) &&
          neighborhoodPaths.has(e.target)
        ) {
          const src = nodeToDir.get(e.source);
          const tgt = nodeToDir.get(e.target);
          if (src && tgt && src !== tgt) {
            const edgeId = `${src}->${tgt}`;
            if (!addedEdges.has(edgeId)) {
              addedEdges.add(edgeId);
              finalEdges.push({
                id: edgeId,
                source: src,
                target: tgt,
                style: { stroke: "var(--color-border)", strokeOpacity: 0.5 },
                animated: false,
                markerEnd: {
                  type: "arrowclosed" as any,
                  color: "var(--color-border)",
                },
              });
            }
          }
        }
      });
    } else {
      finalNodes = visibleNodes.map((n) => ({
        id: n.path,
        type: "file",
        position: { x: 0, y: 0 },
        data: {
          ...n,
          label: n.name || n.path.split("/").pop(),
          risk_score: n.risk_score,
          heatmapMode,
          impacted: impactedPaths.has(n.path),
          isCycle: cyclePaths.has(n.path),
          isIsolated: isolatedPaths.has(n.path),
        },
      }));
      finalEdges = rawEdges
        .filter(
          (e) =>
            neighborhoodPaths.has(e.source) && neighborhoodPaths.has(e.target),
        )
        .map((e, i) => ({
          id: `e${i}`,
          source: e.source,
          target: e.target,
          style: {
            stroke: "var(--color-border)",
            strokeOpacity: heatmapMode ? 0.8 : 0.5,
          },
          animated: false,
          markerEnd: {
            type: "arrowclosed" as any,
            color: "var(--color-border)",
          },
        }));
    }

    return getLayoutedElements(finalNodes, finalEdges, layoutDir);
  }, [
    visibleNodes,
    rawEdges,
    layoutDir,
    groupByDir,
    expandedDirs,
    neighborhoodPaths,
    heatmapMode,
    impactedPaths,
    cyclePaths,
    isolatedPaths,
  ]);

  // Re-center when layout changes significantly
  useEffect(() => {
    setTimeout(() => fitView({ duration: 600, padding: 0.2 }), 50);
  }, [flowNodes.length, layoutDir, groupByDir, expandedDirs.size, fitView]);

  const languages = useMemo(
    () => Array.from(new Set(rawNodes.map((n) => n.language).filter(Boolean))),
    [rawNodes],
  );

  const getImpactedPaths = (tree: any, paths = new Set<string>()) => {
    if (!tree) return paths;
    if (tree.file) paths.add(tree.file);
    if (tree.dependents)
      tree.dependents.forEach((d: any) => getImpactedPaths(d, paths));
    return paths;
  };

  const handleNodeClick = async (_: any, node: Node) => {
    if (node.type === "dir") {
      setExpandedDirs((prev) => {
        const next = new Set(prev);
        next.add(node.id);
        return next;
      });
      return;
    }

    const raw = rawNodes.find((n) => n.path === node.id);
    if (raw) {
      setSelectedNode(raw);
      setPropagationData(null);
      setImpactedPaths(new Set());
      setPropagationLoading(true);
      try {
        const res = await analysisAPI.propagation(projectId, node.id);
        if (res.data?.data) {
          setPropagationData(res.data.data);
          setImpactedPaths(getImpactedPaths(res.data.data.propagation_tree));
        }
      } catch (err) {
        console.error("Propagation failed", err);
      } finally {
        setPropagationLoading(false);
      }
    }
  };

  const handleJumpToHotspot = (path: string) => {
    const node = flowNodes.find((n) => n.id === path);
    if (node) {
      setSelectedNode(rawNodes.find((n) => n.path === path) || null);
      setCenter(node.position.x, node.position.y, { zoom: 1.5, duration: 800 });
    }
  };

  const handleJumpToSearch = (nodeRaw: GraphNode) => {
    setSearchQuery(nodeRaw.path);
    setShowSearchDropdown(false);
    
    // We must wait for ReactFlow to render the filtered node if it was hidden
    setTimeout(() => {
      // Find the node in the current flow nodes or re-compute layout if needed
      // Actually, since we updated searchQuery, it might be in the next render cycle.
      // 100ms should be enough for the next render
      const flowNode = flowNodes.find((n) => n.id === nodeRaw.path);
      if (flowNode) {
        setSelectedNode(nodeRaw);
        setCenter(flowNode.position.x, flowNode.position.y, { zoom: 1.5, duration: 800 });
      } else {
         // fallback if it wasn't rendered yet
         setSelectedNode(nodeRaw);
      }
    }, 150);
  };

  const exportCSV = () => {
    const headers = [
      "path",
      "language",
      "risk_score",
      "lines_of_code",
      "in_degree",
      "out_degree",
    ];
    const rows = filtered.map((n) =>
      [
        n.path,
        n.language || "",
        n.risk_score,
        n.lines_of_code,
        n.in_degree || 0,
        n.out_degree || 0,
      ].join(","),
    );
    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "dependency_graph.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPNG = () => {
    const el = document.querySelector(".react-flow__viewport") as HTMLElement;
    if (!el) return;
    toPng(el, { backgroundColor: "#0d1117" }).then((dataUrl) => {
      const link = document.createElement("a");
      link.download = "graph_viewport.png";
      link.href = dataUrl;
      link.click();
    });
  };

  const isLoading = nodesLoading || edgesLoading;

  const hotspots = useMemo(() => {
    return [...rawNodes]
      .sort((a, b) => (b.in_degree || 0) - (a.in_degree || 0))
      .slice(0, 3);
  }, [rawNodes]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
      {/* Toolbar */}
      <div
        style={{
          padding: "var(--space-3) var(--space-4)",
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-4)",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            fontSize: "var(--text-xs)",
            color: "var(--color-text-muted)",
          }}
        >
          <Link
            href="/dashboard"
            style={{ color: "var(--color-text-muted)", textDecoration: "none" }}
          >
            Projects
          </Link>
          <span>/</span>
          <Link
            href={`/dashboard/${projectId}`}
            style={{ color: "var(--color-text-muted)", textDecoration: "none" }}
          >
            Overview
          </Link>
          <span>/</span>
          <span style={{ color: "var(--color-text)" }}>Dependency Graph</span>
        </div>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: "var(--space-2)",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ position: "relative" }}>
            <input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(true);
                setSearchFocusIdx(-1);
              }}
              onFocus={() => setShowSearchDropdown(true)}
              onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
              onKeyDown={(e) => {
                if (!showSearchDropdown || searchResults.length === 0) return;
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setSearchFocusIdx((prev) => (prev < searchResults.length - 1 ? prev + 1 : prev));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setSearchFocusIdx((prev) => (prev > 0 ? prev - 1 : 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (searchFocusIdx >= 0 && searchFocusIdx < searchResults.length) {
                    handleJumpToSearch(searchResults[searchFocusIdx]);
                  } else if (searchResults.length > 0) {
                    handleJumpToSearch(searchResults[0]);
                  }
                } else if (e.key === "Escape") {
                  setShowSearchDropdown(false);
                }
              }}
              placeholder="Search files..."
              style={{
                padding: "var(--space-1) var(--space-3)",
                borderRadius: "var(--radius-md)",
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
                fontSize: "var(--text-xs)",
                outline: "none",
                width: "200px",
              }}
            />
            {showSearchDropdown && searchResults.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  width: "100%",
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  marginTop: "4px",
                  zIndex: 50,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                  maxHeight: "300px",
                  overflowY: "auto",
                }}
              >
                {searchResults.map((res, idx) => (
                  <div
                    key={res.path}
                    onClick={() => handleJumpToSearch(res)}
                    style={{
                      padding: "var(--space-2) var(--space-3)",
                      fontSize: "var(--text-xs)",
                      cursor: "pointer",
                      background: idx === searchFocusIdx ? "var(--color-surface-offset)" : "transparent",
                      borderBottom: "1px solid var(--color-border)",
                      wordBreak: "break-all",
                    }}
                    onMouseEnter={() => setSearchFocusIdx(idx)}
                  >
                    <div style={{ fontWeight: 600 }}>{res.name || res.path.split("/").pop()}</div>
                    <div style={{ color: "var(--color-text-muted)", fontSize: "10px" }}>{res.path}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <select
            value={filterLang}
            onChange={(e) => setFilterLang(e.target.value)}
            style={{
              padding: "var(--space-1) var(--space-3)",
              borderRadius: "var(--radius-md)",
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
              fontSize: "var(--text-xs)",
              outline: "none",
            }}
          >
            <option value="">All Languages</option>
            {languages.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            style={{
              padding: "var(--space-1) var(--space-3)",
              borderRadius: "var(--radius-md)",
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
              fontSize: "var(--text-xs)",
              outline: "none",
            }}
          >
            <option value="">All Risks</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="low">Low Risk</option>
          </select>
          <select
            value={focusDepth}
            onChange={(e) => setFocusDepth(Number(e.target.value))}
            style={{
              padding: "var(--space-1) var(--space-3)",
              borderRadius: "var(--radius-md)",
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
              fontSize: "var(--text-xs)",
              outline: "none",
            }}
          >
            <option value={1}>1 hop focus</option>
            <option value={2}>2 hops focus</option>
            <option value={3}>3 hops focus</option>
          </select>

          <div
            style={{
              width: 1,
              height: 20,
              background: "var(--color-divider)",
              margin: "0 var(--space-2)",
            }}
          />

          <button
            onClick={() => setLayoutDir((d) => (d === "TB" ? "LR" : "TB"))}
            style={{
              padding: "var(--space-1) var(--space-3)",
              borderRadius: "var(--radius-md)",
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
              fontSize: "var(--text-xs)",
              cursor: "pointer",
            }}
          >
            Layout: {layoutDir === "TB" ? "↕" : "↔"}
          </button>

          <button
            onClick={() => setHeatmapMode(!heatmapMode)}
            style={{
              padding: "var(--space-1) var(--space-3)",
              borderRadius: "var(--radius-md)",
              background: heatmapMode
                ? "rgba(248,81,73,0.15)"
                : "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              color: heatmapMode ? "var(--color-error)" : "var(--color-text)",
              fontSize: "var(--text-xs)",
              cursor: "pointer",
            }}
          >
            🔥 Heatmap
          </button>

          <button
            onClick={() => {
              setGroupByDir(!groupByDir);
              setExpandedDirs(new Set());
            }}
            style={{
              padding: "var(--space-1) var(--space-3)",
              borderRadius: "var(--radius-md)",
              background: groupByDir
                ? "var(--color-primary-highlight)"
                : "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              color: groupByDir ? "var(--color-primary)" : "var(--color-text)",
              fontSize: "var(--text-xs)",
              cursor: "pointer",
            }}
          >
            📁 Group Dirs
          </button>

          <button
            onClick={exportCSV}
            style={{
              padding: "var(--space-1) var(--space-3)",
              borderRadius: "var(--radius-md)",
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
              fontSize: "var(--text-xs)",
              cursor: "pointer",
            }}
          >
            📥 CSV
          </button>

          <button
            onClick={exportPNG}
            style={{
              padding: "var(--space-1) var(--space-3)",
              borderRadius: "var(--radius-md)",
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
              fontSize: "var(--text-xs)",
              cursor: "pointer",
            }}
          >
            🖼 PNG
          </button>

          <button
            onClick={() => setShowHelp(true)}
            style={{
              padding: "var(--space-1) var(--space-3)",
              borderRadius: "var(--radius-md)",
              background: "var(--color-primary-highlight)",
              border: "1px solid var(--color-primary)",
              color: "var(--color-primary)",
              fontSize: "var(--text-xs)",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            ℹ️ Help
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div
        style={{
          padding: "var(--space-2) var(--space-4)",
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-surface-offset)",
          display: "flex",
          gap: "var(--space-4)",
          flexWrap: "wrap",
          fontSize: "var(--text-xs)",
          color: "var(--color-text)",
          alignItems: "center",
        }}
      >
        <span style={{ fontWeight: 600 }}>
          {visibleNodes.length} / {rawNodes.length} nodes visible
        </span>
        <span style={{ color: "var(--color-text-muted)" }}>|</span>
        <span>{flowEdges.length} edges</span>
        <span style={{ color: "var(--color-text-muted)" }}>|</span>
        <span style={{ color: "var(--color-error)" }}>
          {visibleNodes.filter((n) => (n.risk_score || 0) >= 0.7).length} high
          risk
        </span>
        <span style={{ color: "var(--color-text-muted)" }}>|</span>

        <button
          onClick={() => setShowIsolatedOnly(!showIsolatedOnly)}
          style={{
            background: showIsolatedOnly
              ? "var(--color-surface)"
              : "transparent",
            border: "1px solid var(--color-border)",
            padding: "2px 8px",
            borderRadius: "12px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          🔍 {isolatedPaths.size} isolated
        </button>

        <button
          onClick={() => setShowCyclesOnly(!showCyclesOnly)}
          style={{
            background: showCyclesOnly ? "var(--color-purple)" : "transparent",
            border: `1px solid ${showCyclesOnly ? "var(--color-purple)" : "var(--color-border)"}`,
            color: showCyclesOnly ? "#000" : "var(--color-text)",
            padding: "2px 8px",
            borderRadius: "12px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          🔄 {cyclesData?.data?.length || 0} cycles
        </button>

        <span
          style={{
            marginLeft: "auto",
            color: "var(--color-text-muted)",
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          Hotspots:
          {hotspots.map((h) => (
            <button
              key={h.path}
              onClick={() => handleJumpToHotspot(h.path)}
              style={{
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
                padding: "2px 6px",
                borderRadius: 4,
                cursor: "pointer",
                fontFamily: "monospace",
              }}
            >
              {h.name}
            </button>
          ))}
        </span>
      </div>

      {/* Main Canvas Area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {isLoading ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  border: "3px solid var(--color-surface-offset)",
                  borderTop: "3px solid var(--color-primary)",
                  borderRadius: "50%",
                  marginInline: "auto",
                  marginBottom: "var(--space-4)",
                }}
                className="animate-spin"
              />
              <p
                style={{
                  color: "var(--color-text-muted)",
                  fontSize: "var(--text-sm)",
                }}
              >
                Loading dependency graph...
              </p>
            </div>
          </div>
        ) : (
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            onNodeClick={handleNodeClick}
            nodeTypes={nodeTypes}
            style={{ background: "var(--color-bg)" }}
            minZoom={0.05}
            maxZoom={3}
            nodesDraggable={true}
          >
            <MiniMap
              style={{ background: "var(--color-surface)" }}
              nodeColor={(n: any) => riskColor(n.data?.risk_score || 0)}
            />
            <Controls />
            <Background
              variant={BackgroundVariant.Dots}
              color="var(--color-border)"
            />
          </ReactFlow>
        )}

        {/* Loading Overlay for Propagation */}
        {propagationLoading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(13,17,23,0.5)",
              zIndex: 50,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(2px)",
            }}
          >
            <div
              style={{
                background: "var(--color-surface)",
                padding: "20px",
                borderRadius: "12px",
                border: "1px solid var(--color-primary)",
                textAlign: "center",
                boxShadow: "0 0 20px rgba(88,166,255,0.2)",
              }}
            >
              <div
                className="animate-spin"
                style={{
                  width: 30,
                  height: 30,
                  border: "3px solid transparent",
                  borderTop: "3px solid var(--color-primary)",
                  borderRadius: "50%",
                  margin: "0 auto 10px",
                }}
              />
              <p style={{ fontSize: "14px", fontWeight: 600 }}>
                Analyzing blast radius...
              </p>
              <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                Running LLM propagation checks
              </p>
            </div>
          </div>
        )}

        {/* Selected Node Panel */}
        {selectedNode && (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: "380px",
              background: "var(--color-surface)",
              borderLeft: "1px solid var(--color-border)",
              padding: "var(--space-5)",
              overflowY: "auto",
              zIndex: 10,
            }}
            className="animate-fadeIn"
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "var(--space-4)",
              }}
            >
              <h3 style={{ fontSize: "var(--text-sm)", fontWeight: 700 }}>
                File Details
              </h3>
              <button
                onClick={() => {
                  setSelectedNode(null);
                  setImpactedPaths(new Set());
                }}
                style={{ color: "var(--color-text-muted)" }}
              >
                ✕
              </button>
            </div>
            <code
              style={{
                display: "block",
                fontSize: "var(--text-xs)",
                color: "var(--color-primary)",
                wordBreak: "break-all",
                marginBottom: "var(--space-4)",
                fontFamily: "monospace",
              }}
            >
              {selectedNode.path}
            </code>
            {[
              { label: "Language", value: selectedNode.language },
              { label: "Lines of Code", value: selectedNode.lines_of_code },
              {
                label: "Complexity Score",
                value: selectedNode.complexity_score?.toFixed(1),
              },
              {
                label: "Size",
                value: `${(selectedNode.size_bytes / 1024).toFixed(1)} KB`,
              },
              { label: "In Degree", value: selectedNode.in_degree ?? 0 },
              { label: "Out Degree", value: selectedNode.out_degree ?? 0 },
            ].map(({ label, value }) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "var(--space-2) 0",
                  borderBottom: "1px solid var(--color-divider)",
                }}
              >
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--color-text-muted)",
                  }}
                >
                  {label}
                </span>
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    fontWeight: 600,
                    fontFamily: label === "Language" ? "inherit" : "monospace",
                  }}
                >
                  {value ?? "—"}
                </span>
              </div>
            ))}
            <div style={{ marginTop: "var(--space-4)" }}>
              <p
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--color-text-muted)",
                  marginBottom: "var(--space-2)",
                }}
              >
                Risk Score
              </p>
              <div
                style={{
                  height: 6,
                  background: "var(--color-surface-offset)",
                  borderRadius: "var(--radius-full)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderRadius: "var(--radius-full)",
                    background: riskColor(selectedNode.risk_score || 0),
                    width: `${(selectedNode.risk_score || 0) * 100}%`,
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: "var(--text-xs)",
                  color: riskColor(selectedNode.risk_score || 0),
                  marginTop: "var(--space-1)",
                  display: "block",
                }}
              >
                {((selectedNode.risk_score || 0) * 100).toFixed(0)}%
              </span>
            </div>

            {propagationData && (
              <div
                style={{
                  marginTop: "var(--space-6)",
                  paddingTop: "var(--space-4)",
                  borderTop: "1px solid var(--color-divider)",
                }}
              >
                <h4
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    marginBottom: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span style={{ color: "var(--color-error)" }}>⚡</span> Blast
                  Radius
                </h4>
                <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                  <div
                    style={{
                      background: "var(--color-surface-2)",
                      padding: "6px 10px",
                      borderRadius: 6,
                      flex: 1,
                    }}
                  >
                    <div
                      style={{ fontSize: 11, color: "var(--color-text-muted)" }}
                    >
                      Impacted Files
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>
                      {propagationData.total_impacted_files}
                    </div>
                  </div>
                  <div
                    style={{
                      background: "var(--color-surface-2)",
                      padding: "6px 10px",
                      borderRadius: 6,
                      flex: 1,
                    }}
                  >
                    <div
                      style={{ fontSize: 11, color: "var(--color-text-muted)" }}
                    >
                      Prop Risk
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: riskColor(propagationData.risk_score),
                      }}
                    >
                      {Math.round(propagationData.risk_score * 100)}%
                    </div>
                  </div>
                </div>
                {propagationData.analysis && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--color-text-muted)",
                      background: "var(--color-bg)",
                      padding: 10,
                      borderRadius: 6,
                      lineHeight: 1.5,
                      maxHeight: 150,
                      overflowY: "auto",
                    }}
                  >
                    {propagationData.analysis}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div
        style={{
          padding: "var(--space-2) var(--space-4)",
          borderTop: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          display: "flex",
          gap: "var(--space-6)",
          flexWrap: "wrap",
          fontSize: "var(--text-xs)",
          color: "var(--color-text-muted)",
          alignItems: "center",
        }}
      >
        <span>Legend:</span>
        <span>
          <span style={{ color: "#3fb950" }}>●</span> Low risk
        </span>
        <span>
          <span style={{ color: "#d29922" }}>●</span> Medium risk
        </span>
        <span>
          <span style={{ color: "#f85149" }}>●</span> High risk
        </span>
        <span style={{ color: "var(--color-divider)" }}>|</span>
        <span>
          <span
            style={{
              border: "2px dashed var(--color-purple)",
              borderRadius: 4,
              padding: "0 4px",
            }}
          >
            ♻️
          </span>{" "}
          In cycle
        </span>
        <span>
          <span
            style={{
              border: "2px dashed var(--color-text-faint)",
              borderRadius: 4,
              padding: "0 4px",
            }}
          >
            Isolated
          </span>
        </span>
        <span>
          <span
            style={{
              border: "2px solid var(--color-error)",
              borderRadius: 4,
              padding: "0 4px",
              boxShadow: "0 0 8px var(--color-error)",
            }}
          >
            Impacted
          </span>
        </span>
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(13,17,23,0.8)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setShowHelp(false)}
        >
          <div
            style={{
              background: "var(--color-surface)",
              padding: "var(--space-6)",
              borderRadius: "var(--radius-xl)",
              border: "1px solid var(--color-border)",
              maxWidth: 600,
              width: "100%",
              maxHeight: "80vh",
              overflowY: "auto",
              boxShadow: "var(--shadow-lg)",
            }}
            onClick={(e) => e.stopPropagation()}
            className="animate-fadeIn"
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "var(--space-4)",
              }}
            >
              <h2
                style={{
                  fontSize: "var(--text-lg)",
                  fontWeight: 700,
                  fontFamily: "var(--font-display)",
                }}
              >
                Dependency Graph Features
              </h2>
              <button
                onClick={() => setShowHelp(false)}
                style={{ color: "var(--color-text-muted)" }}
              >
                ✕
              </button>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-4)",
                fontSize: "var(--text-sm)",
                color: "var(--color-text)",
              }}
            >
              <div
                style={{
                  background: "var(--color-surface-2)",
                  padding: "var(--space-3)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <strong style={{ color: "var(--color-text)" }}>
                  ↕/↔ Auto-Layout:
                </strong>
                <p
                  style={{ color: "var(--color-text-muted)", marginTop: "4px" }}
                >
                  Switches the graph between a top-to-bottom and left-to-right
                  layout to reveal the true directional dependency flow instead
                  of a clustered grid.
                </p>
              </div>
              <div
                style={{
                  background: "var(--color-surface-2)",
                  padding: "var(--space-3)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <strong style={{ color: "var(--color-text)" }}>
                  🔥 Heatmap Mode:
                </strong>
                <p
                  style={{ color: "var(--color-text-muted)", marginTop: "4px" }}
                >
                  Color-codes all files based on their risk score (green = low
                  risk, red = high risk). Useful for quickly spotting technical
                  debt hotspots in a large codebase.
                </p>
              </div>
              <div
                style={{
                  background: "var(--color-surface-2)",
                  padding: "var(--space-3)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <strong style={{ color: "var(--color-text)" }}>
                  📁 Group Dirs:
                </strong>
                <p
                  style={{ color: "var(--color-text-muted)", marginTop: "4px" }}
                >
                  Collapses individual files into their parent directories to
                  reduce graph clutter. You can click on a directory node to
                  expand it in-place without losing context.
                </p>
              </div>
              <div
                style={{
                  background: "var(--color-surface-2)",
                  padding: "var(--space-3)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <strong style={{ color: "var(--color-text)" }}>
                  ⚡ Click-to-Propagate:
                </strong>
                <p
                  style={{ color: "var(--color-text-muted)", marginTop: "4px" }}
                >
                  Click on any file node to run an AI-powered propagation
                  analysis. It instantly highlights all downstream files that
                  might break if you make changes to the selected file.
                </p>
              </div>
              <div
                style={{
                  background: "var(--color-surface-2)",
                  padding: "var(--space-3)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <strong style={{ color: "var(--color-text)" }}>
                  🔄 Cycles:
                </strong>
                <p
                  style={{ color: "var(--color-text-muted)", marginTop: "4px" }}
                >
                  The backend automatically detects circular import
                  dependencies. Files trapped in a cycle have a dashed purple
                  border. You can click the &quot;cycles&quot; chip in the stats
                  bar to filter the graph specifically to view cycles.
                </p>
              </div>
              <div
                style={{
                  background: "var(--color-surface-2)",
                  padding: "var(--space-3)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <strong style={{ color: "var(--color-text)" }}>
                  🔍 Isolated:
                </strong>
                <p
                  style={{ color: "var(--color-text-muted)", marginTop: "4px" }}
                >
                  Highlights &quot;dead code&quot; candidates—files that import
                  nothing and are imported by nothing. Click the
                  &quot;isolated&quot; chip to quickly locate them.
                </p>
              </div>
              <div
                style={{
                  background: "var(--color-surface-2)",
                  padding: "var(--space-3)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <strong style={{ color: "var(--color-text)" }}>
                  📥 CSV & 🖼 PNG Export:
                </strong>
                <p
                  style={{ color: "var(--color-text-muted)", marginTop: "4px" }}
                >
                  Download the current graph data as a CSV spreadsheet or take a
                  snapshot of the visible viewport as a PNG image to share in
                  pull requests.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GraphPage() {
  return (
    <ReactFlowProvider>
      <GraphPageContent />
    </ReactFlowProvider>
  );
}
