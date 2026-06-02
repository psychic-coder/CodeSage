'use client'

import { X, Download, Upload } from 'lucide-react'
import { GRAPH_NODES, type GraphNode } from '@/lib/mock-graph-data'

interface GraphRightPanelProps {
  node: GraphNode | null
  onClose: () => void
}

export function GraphRightPanel({ node, onClose }: GraphRightPanelProps) {
  if (!node) return null

  const dependencyNodes = GRAPH_NODES.filter((n) => node.dependencies.includes(n.id))
  const dependentNodes = GRAPH_NODES.filter((n) => node.dependents.includes(n.id))

  return (
    <div className="floating-panel w-96 h-full flex flex-col p-6 gap-4">
      {/* Header with close button */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{node.name}</h2>
          <p className="text-xs text-muted-foreground font-mono mt-1">{node.path}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-secondary/50 rounded transition-colors text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Divider */}
      <div className="border-t border-border/30" />

      {/* File metrics */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-secondary/30 rounded p-2">
          <p className="text-xs text-muted-foreground mb-1">Lines</p>
          <p className="text-lg font-bold text-foreground">{node.size}</p>
        </div>
        <div className="bg-secondary/30 rounded p-2">
          <p className="text-xs text-muted-foreground mb-1">Imports</p>
          <p className="text-lg font-bold text-accent">{node.dependencies.length}</p>
        </div>
        <div className="bg-secondary/30 rounded p-2">
          <p className="text-xs text-muted-foreground mb-1">Used By</p>
          <p className="text-lg font-bold text-accent">{node.dependents.length}</p>
        </div>
      </div>

      {/* Type badge */}
      <div className="flex gap-2">
        <span className="px-2 py-1 rounded text-xs font-semibold bg-accent/20 text-accent">
          {node.type}
        </span>
        {node.isTest && <span className="px-2 py-1 rounded text-xs font-semibold bg-amber-500/20 text-amber-400">
          Test File
        </span>}
      </div>

      {/* Dependencies Section */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {/* Imports (Dependencies) */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Download className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-foreground">Imports ({node.dependencies.length})</h3>
          </div>
          <div className="space-y-1">
            {dependencyNodes.length > 0 ? (
              dependencyNodes.map((dep) => (
                <div
                  key={dep.id}
                  className="text-xs p-2 rounded bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                >
                  <p className="text-foreground font-mono">{dep.name}</p>
                  <p className="text-muted-foreground text-xs">{dep.path}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground italic">No dependencies</p>
            )}
          </div>
        </div>

        {/* Dependents */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Upload className="w-4 h-4 text-green-400" />
            <h3 className="text-sm font-semibold text-foreground">Used By ({node.dependents.length})</h3>
          </div>
          <div className="space-y-1">
            {dependentNodes.length > 0 ? (
              dependentNodes.map((dep) => (
                <div
                  key={dep.id}
                  className="text-xs p-2 rounded bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                >
                  <p className="text-foreground font-mono">{dep.name}</p>
                  <p className="text-muted-foreground text-xs">{dep.path}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground italic">Not used by any files</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
