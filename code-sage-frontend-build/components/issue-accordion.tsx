'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Issue {
  id: number
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  location: string
  description: string
  code: string
  fix: string
}

interface IssueAccordionProps {
  issue: Issue
}

const severityColors = {
  critical: { bg: 'bg-[#E85D75]/10', border: 'border-[#E85D75]', badge: 'bg-[#E85D75]/20 text-[#E85D75]' },
  high: { bg: 'bg-[#F59E0B]/10', border: 'border-[#F59E0B]', badge: 'bg-[#F59E0B]/20 text-[#F59E0B]' },
  medium: { bg: 'bg-[#FBBF24]/10', border: 'border-[#FBBF24]', badge: 'bg-[#FBBF24]/20 text-[#FBBF24]' },
  low: { bg: 'bg-[#3B82F6]/10', border: 'border-[#3B82F6]', badge: 'bg-[#3B82F6]/20 text-[#3B82F6]' },
}

export function IssueAccordion({ issue }: IssueAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const colors = severityColors[issue.severity]

  return (
    <div
      className={cn(
        'glass-dark rounded-lg border transition-all duration-200',
        colors.border,
        isExpanded ? colors.bg : 'border-border'
      )}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-start justify-between p-4 text-left hover:bg-white/5 transition-colors',
          isExpanded && colors.bg
        )}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Severity Badge */}
          <div
            className={cn(
              'px-2 py-1 rounded text-xs font-semibold uppercase whitespace-nowrap mt-0.5',
              colors.badge
            )}
          >
            {issue.severity}
          </div>

          {/* Title and Location */}
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground line-clamp-2">{issue.title}</h3>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{issue.location}</p>
          </div>
        </div>

        {/* Chevron */}
        <ChevronDown
          className={cn(
            'w-5 h-5 text-muted-foreground transition-transform duration-300 flex-shrink-0 ml-2',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-border px-4 py-4 space-y-4">
          {/* Description */}
          <div>
            <p className="text-sm text-foreground leading-relaxed">{issue.description}</p>
          </div>

          {/* Code Block */}
          <div>
            <p className="text-xs uppercase font-semibold text-muted-foreground mb-2">Affected Code</p>
            <div className="code-block bg-secondary rounded-md border border-border overflow-x-auto">
              <pre className="p-4 text-xs leading-relaxed">
                <code className="text-foreground font-mono">{issue.code}</code>
              </pre>
            </div>
          </div>

          {/* Suggested Fix */}
          <div>
            <p className="text-xs uppercase font-semibold text-muted-foreground mb-2">Suggested Fix</p>
            <div
              className={cn(
                'border-l-4 px-4 py-3 rounded-r-md bg-secondary/50',
                colors.border
              )}
            >
              <p className="text-sm text-foreground">{issue.fix}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
