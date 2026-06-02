import { Clock, ExternalLink } from 'lucide-react'
import type { Improvement } from '@/lib/mock-improvements-data'

interface ImprovementCardProps {
  improvement: Improvement
}

const EFFORT_COLORS = {
  low: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/50' },
  medium: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/50' },
  high: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/50' },
}

const CATEGORY_COLORS = {
  security: { border: 'border-security', accent: '#3B82F6', textAccent: 'text-blue-400' },
  performance: { border: 'border-performance', accent: '#F59E0B', textAccent: 'text-amber-400' },
  refactoring: { border: 'border-refactoring', accent: '#A855F7', textAccent: 'text-purple-400' },
  critical: { border: 'border-critical', accent: '#E85D75', textAccent: 'text-red-400' },
}

export function ImprovementCard({ improvement }: ImprovementCardProps) {
  const categoryColor = CATEGORY_COLORS[improvement.category]
  const effortColor = EFFORT_COLORS[improvement.effort]

  return (
    <div
      className={`glass-dark rounded-lg border border-border improvement-card-border ${categoryColor.border} p-6 hover:border-border/80 transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,217,255,0.1)]`}
    >
      {/* Header */}
      <div className="mb-4">
        <h3 className={`text-lg font-semibold text-foreground mb-2 ${categoryColor.textAccent}`}>
          {improvement.title}
        </h3>
        <p className="text-sm text-muted-foreground mb-3">{improvement.description}</p>

        {/* Effort Badge */}
        <div
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold border ${effortColor.bg} ${effortColor.text} ${effortColor.border}`}
        >
          <Clock className="w-3 h-3" />
          <span>
            {improvement.effort.charAt(0).toUpperCase() + improvement.effort.slice(1)} • ~
            {improvement.estimatedHours}h
          </span>
        </div>
      </div>

      {/* Affected Files */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-muted-foreground mb-2">Affected Files</p>
        <div className="flex flex-wrap gap-2">
          {improvement.affectedFiles.map((file) => (
            <a
              key={file}
              href="#"
              className="font-mono text-xs px-2 py-1 rounded bg-secondary/50 border border-border text-blue-400 hover:text-blue-300 hover:border-blue-400/50 transition-colors cursor-pointer"
            >
              {file}
            </a>
          ))}
        </div>
      </div>

      {/* Code Snippets */}
      <div className="space-y-3 mb-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Current Code</p>
          <pre className="bg-secondary/50 p-3 rounded border border-border/50 overflow-x-auto">
            <code className="font-mono text-xs text-red-400">{improvement.currentCode}</code>
          </pre>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Improvement</p>
          <pre className="bg-secondary/50 p-3 rounded border border-border/50 overflow-x-auto">
            <code className="font-mono text-xs text-green-400">{improvement.improvementCode}</code>
          </pre>
        </div>
      </div>

      {/* Impact */}
      <div className="pt-3 border-t border-border/30">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Impact:</span> {improvement.impact}
        </p>
      </div>
    </div>
  )
}
