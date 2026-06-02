'use client'

import { Search, Eye, EyeOff } from 'lucide-react'

interface GraphLeftPanelProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  excludeTests: boolean
  onExcludeTestsChange: (exclude: boolean) => void
  groupByDirectory: boolean
  onGroupByDirectoryChange: (group: boolean) => void
  heatmapMode: boolean
  onHeatmapModeChange: (mode: boolean) => void
}

export function GraphLeftPanel({
  searchQuery,
  onSearchChange,
  excludeTests,
  onExcludeTestsChange,
  groupByDirectory,
  onGroupByDirectoryChange,
  heatmapMode,
  onHeatmapModeChange,
}: GraphLeftPanelProps) {
  return (
    <div className="floating-panel w-80 h-full flex flex-col p-6 gap-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Filters & Controls</h2>
        <p className="text-xs text-muted-foreground mt-1">Configure graph visualization</p>
      </div>

      {/* Search Bar */}
      <div>
        <label className="text-sm font-semibold text-foreground block mb-2">Search Files</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by filename..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-secondary/50 border border-border rounded-md text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50"
          />
        </div>
        {searchQuery && (
          <p className="text-xs text-muted-foreground mt-2">Highlighting "{searchQuery}" in graph</p>
        )}
      </div>

      {/* Filters Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Filters</h3>

        {/* Exclude Tests */}
        <label className="flex items-center gap-3 cursor-pointer hover:bg-secondary/30 p-2 rounded transition-colors">
          <input
            type="checkbox"
            checked={excludeTests}
            onChange={(e) => onExcludeTestsChange(e.target.checked)}
            className="w-4 h-4 rounded border-border bg-secondary cursor-pointer accent-accent"
          />
          <span className="text-sm text-foreground flex-1">Exclude test files</span>
        </label>

        {/* Group by Directory */}
        <label className="flex items-center gap-3 cursor-pointer hover:bg-secondary/30 p-2 rounded transition-colors">
          <input
            type="checkbox"
            checked={groupByDirectory}
            onChange={(e) => onGroupByDirectoryChange(e.target.checked)}
            className="w-4 h-4 rounded border-border bg-secondary cursor-pointer accent-accent"
          />
          <span className="text-sm text-foreground flex-1">Group by directory</span>
        </label>
      </div>

      {/* Heatmap Toggle */}
      <div className="pt-4 border-t border-border/30">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Heatmap Mode</h3>
          <button
            onClick={() => onHeatmapModeChange(!heatmapMode)}
            className={`relative w-10 h-6 rounded-full transition-all ${
              heatmapMode ? 'bg-accent/30' : 'bg-secondary'
            }`}
          >
            <div
              className={`absolute top-1 w-4 h-4 rounded-full bg-accent transition-transform ${
                heatmapMode ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {heatmapMode && (
          <div className="space-y-2 p-3 rounded-md bg-secondary/30 border border-border/30">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Color scale:</span> Represents total dependencies
            </p>
            <div className="h-2 rounded-full overflow-hidden" style={{
              background: 'linear-gradient(to right, hsl(120, 100%, 50%), hsl(0, 100%, 50%))'
            }} />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mt-auto pt-4 border-t border-border/30 space-y-2">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Hint:</span> Click nodes to see details
        </p>
      </div>
    </div>
  )
}
