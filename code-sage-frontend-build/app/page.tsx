'use client'

import { AppLayout } from '@/components/app-layout'
import { BarChart, Activity, GitBranch, Code2, Zap, TrendingUp } from 'lucide-react'

export default function Page() {
  return (
    <AppLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Overview</h1>
          <p className="text-muted-foreground">AI-powered insights into your codebase</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: Code2, label: 'Total Files', value: '2,847' },
            { icon: GitBranch, label: 'Branches', value: '12' },
            { icon: Activity, label: 'Active Contributors', value: '24' },
            { icon: TrendingUp, label: 'Complexity Score', value: '7.8/10' },
            { icon: Zap, label: 'Performance Score', value: '8.2/10' },
            { icon: BarChart, label: 'Test Coverage', value: '92%' },
          ].map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.label}
                className="glass-dark rounded-lg p-6 border border-border hover-glow transition-all duration-300 hover:border-accent/50"
              >
                <div className="flex items-start justify-between mb-4">
                  <Icon className="w-6 h-6 text-accent" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Recent Activity */}
        <div className="glass-dark rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Recent Analysis</h2>
          <div className="space-y-3">
            {[
              { title: 'Performance Bottleneck Found', time: '2 hours ago', status: 'critical' },
              { title: 'New Dependency Vulnerability', time: '5 hours ago', status: 'warning' },
              { title: 'Code Complexity Increased', time: '1 day ago', status: 'info' },
              { title: 'Test Coverage Improved', time: '2 days ago', status: 'success' },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-center justify-between p-3 rounded-md hover:bg-sidebar-accent/30 transition-colors duration-200"
              >
                <div>
                  <p className="text-foreground font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.time}</p>
                </div>
                <div
                  className={`h-2 w-2 rounded-full ${
                    item.status === 'critical'
                      ? 'bg-destructive'
                      : item.status === 'warning'
                      ? 'bg-[#F59E0B]'
                      : item.status === 'success'
                      ? 'bg-[#10B981]'
                      : 'bg-[#00D9FF]'
                  }`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
