'use client'

import { GRAPH_NODES, type GraphNode } from '@/lib/mock-graph-data'

interface DependencyGraphCanvasProps {
  selectedNode: GraphNode | null
  heatmapMode: boolean
  searchQuery: string
  excludeTests: boolean
  onNodeSelect: (node: GraphNode) => void
}

export function DependencyGraphCanvas({
  selectedNode,
  heatmapMode,
  searchQuery,
  excludeTests,
  onNodeSelect,
}: DependencyGraphCanvasProps) {
  // Filter nodes based on settings
  const filteredNodes = GRAPH_NODES.filter((node) => {
    if (excludeTests && node.isTest) return false
    if (searchQuery && !node.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  // Calculate positions for nodes in a circular layout
  const nodePositions = filteredNodes.reduce(
    (acc, node, idx) => {
      const angle = (idx / filteredNodes.length) * Math.PI * 2
      const radius = 200
      const x = 512 + radius * Math.cos(angle)
      const y = 300 + radius * Math.sin(angle)
      acc[node.id] = { x, y }
      return acc
    },
    {} as Record<string, { x: number; y: number }>
  )

  // Calculate heatmap color based on metric
  const getNodeColor = (node: GraphNode) => {
    if (heatmapMode) {
      const metric = node.dependencies.length + node.dependents.length
      const maxMetric = 15
      const ratio = Math.min(metric / maxMetric, 1)
      // Green to red gradient
      const hue = (1 - ratio) * 120 // 120 (green) to 0 (red)
      return `hsl(${hue}, 100%, 50%)`
    }
    return '#00D9FF' // Default cyan
  }

  const getNodeOpacity = (node: GraphNode) => {
    if (!searchQuery) return 1
    return node.name.toLowerCase().includes(searchQuery.toLowerCase()) ? 1 : 0.3
  }

  return (
    <div className="w-full h-full relative bg-background dot-matrix overflow-hidden">
      {/* SVG Canvas */}
      <svg className="w-full h-full absolute inset-0" style={{ background: 'transparent' }}>
        {/* Edges */}
        {filteredNodes.map((node) =>
          node.dependencies.map((depId) => {
            const dep = filteredNodes.find((n) => n.id === depId)
            if (!dep || !nodePositions[node.id] || !nodePositions[depId]) return null

            const from = nodePositions[node.id]
            const to = nodePositions[depId]

            return (
              <line
                key={`${node.id}-${depId}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="#333333"
                strokeWidth="1"
                strokeDasharray="4,4"
                opacity="0.3"
              />
            )
          })
        )}

        {/* Nodes */}
        {filteredNodes.map((node) => {
          const pos = nodePositions[node.id]
          if (!pos) return null

          const isSelected = selectedNode?.id === node.id
          const color = getNodeColor(node)
          const opacity = getNodeOpacity(node)

          return (
            <g
              key={node.id}
              className="graph-node"
              style={{ opacity }}
              onClick={() => onNodeSelect(node)}
            >
              {/* Outer glow circle if selected */}
              {isSelected && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="28"
                  fill="none"
                  stroke="#00D9FF"
                  strokeWidth="2"
                  opacity="0.4"
                  className="animate-pulse"
                />
              )}

              {/* Node circle */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r="20"
                fill={color}
                fillOpacity={isSelected ? 0.9 : 0.6}
                stroke={color}
                strokeWidth={isSelected ? 2 : 1}
                className={isSelected ? 'graph-node-selected' : ''}
              />

              {/* Node label */}
              <text
                x={pos.x}
                y={pos.y + 35}
                textAnchor="middle"
                className="text-xs font-mono fill-foreground"
                opacity={opacity}
              >
                {node.name.substring(0, 12)}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Empty state message */}
      {filteredNodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-muted-foreground">No files match the current filters</p>
        </div>
      )}
    </div>
  )
}
