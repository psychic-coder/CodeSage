'use client'

import { AppLayout } from '@/components/app-layout'
import { Activity, GitBranch, Users, Clock, AlertCircle } from 'lucide-react'

export default function ImpactAnalysisPage() {
  return (
    <AppLayout>
      <div className="p-8 space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Impact Analysis</h1>
          <p className="text-muted-foreground">Analyze the impact of code changes across your codebase</p>
        </div>

        {/* Impact metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: GitBranch, label: 'Files Affected', value: '47', color: 'text-blue-400' },
            { icon: Users, label: 'Developers Impacted', value: '12', color: 'text-purple-400' },
            { icon: Clock, label: 'Time to Review', value: '2h 30m', color: 'text-orange-400' },
            { icon: AlertCircle, label: 'Risk Level', value: 'Medium', color: 'text-yellow-400' },
          ].map((metric) => {
            const Icon = metric.icon
            return (
              <div key={metric.label} className="glass-dark rounded-lg border border-border p-6 hover-glow transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <Icon className={`w-5 h-5 ${metric.color}`} />
                </div>
                <p className="text-sm text-muted-foreground mb-1">{metric.label}</p>
                <p className="text-2xl font-bold text-foreground">{metric.value}</p>
              </div>
            )
          })}
        </div>

        {/* Impact visualization */}
        <div className="glass-dark rounded-lg border border-border p-8 min-h-96 flex items-center justify-center">
          <div className="text-center">
            <Activity className="w-12 h-12 text-accent mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">Change impact visualization</p>
            <p className="text-sm text-muted-foreground mt-2">Dependencies and affected modules</p>
          </div>
        </div>

        {/* Affected modules */}
        <div className="glass-dark rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Most Affected Modules</h2>
          <div className="space-y-3">
            {[
              { name: 'Authentication Module', impact: 85 },
              { name: 'API Layer', impact: 72 },
              { name: 'Database Service', impact: 68 },
              { name: 'UI Components', impact: 45 },
              { name: 'Utilities', impact: 32 },
            ].map((module) => (
              <div key={module.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-foreground font-medium">{module.name}</p>
                  <span className="text-xs text-muted-foreground">{module.impact}%</span>
                </div>
                <div className="h-2 bg-sidebar-accent rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      module.impact > 70
                        ? 'bg-destructive'
                        : module.impact > 50
                        ? 'bg-yellow-500'
                        : 'bg-accent'
                    }`}
                    style={{ width: `${module.impact}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Risk assessment */}
        <div className="glass-dark rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Risk Assessment</h2>
          <div className="space-y-3">
            {[
              { risk: 'Breaking Changes', level: 'Low', icon: '✓' },
              { risk: 'Performance Impact', level: 'Medium', icon: '⚠' },
              { risk: 'Security Concerns', level: 'Low', icon: '✓' },
              { risk: 'Testing Coverage', level: 'High', icon: '✓' },
            ].map((item) => (
              <div key={item.risk} className="flex items-center justify-between p-3 rounded-md hover:bg-sidebar-accent/30 transition-colors">
                <span className="text-foreground font-medium">{item.risk}</span>
                <span
                  className={`text-sm font-medium px-2 py-1 rounded-md ${
                    item.level === 'Low'
                      ? 'bg-green-500/20 text-green-400'
                      : item.level === 'Medium'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}
                >
                  {item.level}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
