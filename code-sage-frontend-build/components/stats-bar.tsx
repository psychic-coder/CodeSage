import { Shield, Zap, RefreshCw, AlertTriangle } from 'lucide-react'

interface StatsBarProps {
  stats: {
    security: number
    performance: number
    refactoring: number
    critical: number
  }
}

export function StatsBar({ stats }: StatsBarProps) {
  const statItems = [
    { label: 'Security', icon: Shield, value: stats.security, color: '#3B82F6', bgColor: 'bg-blue-500/20' },
    { label: 'Performance', icon: Zap, value: stats.performance, color: '#F59E0B', bgColor: 'bg-amber-500/20' },
    { label: 'Refactoring', icon: RefreshCw, value: stats.refactoring, color: '#A855F7', bgColor: 'bg-purple-500/20' },
    { label: 'Critical', icon: AlertTriangle, value: stats.critical, color: '#E85D75', bgColor: 'bg-red-500/20' },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((item) => {
        const Icon = item.icon
        return (
          <div
            key={item.label}
            className={`glass-dark rounded-lg border border-border p-6 stats-glow ${item.bgColor} border-opacity-50`}
            style={{
              boxShadow: `inset 0 0 20px ${item.color}20`,
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <Icon className="w-5 h-5" style={{ color: item.color }} />
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: item.color }} />
            </div>
            <p className="text-sm text-muted-foreground mb-2">{item.label}</p>
            <p className="text-4xl font-bold text-foreground">{item.value}</p>
          </div>
        )
      })}
    </div>
  )
}
