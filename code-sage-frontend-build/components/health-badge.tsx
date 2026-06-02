'use client'

import { CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react'

interface HealthBadgeProps {
  score: number
}

export function HealthBadge({ score }: HealthBadgeProps) {
  const getHealthColor = (score: number) => {
    if (score >= 8) return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' }
    if (score >= 5) return { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' }
    return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' }
  }

  const getIcon = (score: number) => {
    if (score >= 8) return <CheckCircle2 className="w-5 h-5" />
    if (score >= 5) return <AlertCircle className="w-5 h-5" />
    return <AlertTriangle className="w-5 h-5" />
  }

  const colors = getHealthColor(score)
  const isExcellent = score >= 8

  return (
    <div
      className={`flex items-center justify-center gap-2 px-3 py-2 rounded-full border ${colors.bg} ${colors.border} ${
        isExcellent ? 'animate-glow-pulse' : ''
      }`}
    >
      <div className={`${colors.text}`}>{getIcon(score)}</div>
      <span className={`text-sm font-semibold ${colors.text}`}>{score.toFixed(1)}/10</span>
    </div>
  )
}
