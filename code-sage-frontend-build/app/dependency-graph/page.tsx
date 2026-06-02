'use client'

import { useState } from 'react'
import { AppLayout } from '@/components/app-layout'
import { DependencyGraphCanvas } from '@/components/dependency-graph-canvas'
import { GraphLeftPanel } from '@/components/graph-left-panel'
import { GraphRightPanel } from '@/components/graph-right-panel'
import { GRAPH_NODES, type GraphNode } from '@/lib/mock-graph-data'

export default function DependencyGraphPage() {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [excludeTests, setExcludeTests] = useState(false)
  const [groupByDirectory, setGroupByDirectory] = useState(false)
  const [heatmapMode, setHeatmapMode] = useState(false)

  return (
    <AppLayout>
      <div className="relative w-full h-[calc(100vh-80px)]">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-8 pointer-events-none z-10">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Dependency Graph</h1>
            <p className="text-muted-foreground">Interactive file dependency visualization</p>
          </div>
        </div>

        {/* Main Canvas */}
        <DependencyGraphCanvas
          selectedNode={selectedNode}
          heatmapMode={heatmapMode}
          searchQuery={searchQuery}
          excludeTests={excludeTests}
          onNodeSelect={setSelectedNode}
        />

        {/* Left Panel */}
        <div className="absolute top-24 left-6 z-20 panel-slide-in-left">
          <GraphLeftPanel
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            excludeTests={excludeTests}
            onExcludeTestsChange={setExcludeTests}
            groupByDirectory={groupByDirectory}
            onGroupByDirectoryChange={setGroupByDirectory}
            heatmapMode={heatmapMode}
            onHeatmapModeChange={setHeatmapMode}
          />
        </div>

        {/* Right Panel - Context */}
        {selectedNode && (
          <div className="absolute top-24 right-6 z-20 panel-slide-in-right">
            <GraphRightPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
          </div>
        )}
      </div>
    </AppLayout>
  )
}
