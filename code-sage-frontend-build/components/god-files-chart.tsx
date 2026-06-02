'use client'

import { useState } from 'react'

interface GodFile {
  id: number
  name: string
  inDegree: number
  outDegree: number
  lines: number
}

interface GodFilesChartProps {
  files: GodFile[]
}

export function GodFilesChart({ files }: GodFilesChartProps) {
  const [hoveredId, setHoveredId] = useState<number | null>(null)

  const maxDegree = Math.max(
    ...files.flatMap((f) => [f.inDegree, f.outDegree])
  )

  return (
    <div className="space-y-6">
      {files.map((file) => {
        const inPercentage = (file.inDegree / maxDegree) * 100
        const outPercentage = (file.outDegree / maxDegree) * 100

        return (
          <div
            key={file.id}
            className="glass-dark rounded-lg border border-border p-4 hover:border-accent/50 transition-colors duration-200"
            onMouseEnter={() => setHoveredId(file.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {/* File name and line count */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold text-foreground text-sm">{file.name}</p>
                <p className="text-xs text-muted-foreground">{file.lines} lines</p>
              </div>
            </div>

            {/* In Degree Bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">Imports From</span>
                <span
                  className={`text-xs font-semibold transition-colors ${
                    hoveredId === file.id ? 'text-[#3B82F6]' : 'text-muted-foreground'
                  }`}
                >
                  {file.inDegree}
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#3B82F6] h-full rounded-full transition-all duration-300"
                  style={{ width: `${inPercentage}%` }}
                />
              </div>
            </div>

            {/* Out Degree Bar */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">Imports To</span>
                <span
                  className={`text-xs font-semibold transition-colors ${
                    hoveredId === file.id ? 'text-accent' : 'text-muted-foreground'
                  }`}
                >
                  {file.outDegree}
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                <div
                  className="bg-accent h-full rounded-full transition-all duration-300"
                  style={{ width: `${outPercentage}%` }}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
