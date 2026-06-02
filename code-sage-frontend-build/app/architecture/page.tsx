'use client'

import { useState, useMemo } from 'react'
import { AppLayout } from '@/components/app-layout'
import { HealthRing } from '@/components/health-ring'
import { TabNavigation } from '@/components/tab-navigation'
import { SeverityChips } from '@/components/severity-chips'
import { IssueAccordion } from '@/components/issue-accordion'
import { GodFilesChart } from '@/components/god-files-chart'
import { CycleVisualization } from '@/components/cycle-visualization'
import { mockArchitectureData } from '@/lib/mock-architecture-data'

const TABS = ['Issues', 'God Files', 'Cycles', 'Coupling', 'External']

type Severity = 'Critical' | 'High' | 'Medium' | 'Low'

export default function ArchitecturePage() {
  const [activeTab, setActiveTab] = useState('Issues')
  const [selectedSeverities, setSelectedSeverities] = useState<Severity[]>([
    'Critical',
    'High',
    'Medium',
    'Low',
  ])

  const filteredIssues = useMemo(() => {
    return mockArchitectureData.issues.filter((issue) =>
      selectedSeverities.includes(issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1) as Severity)
    )
  }, [selectedSeverities])

  return (
    <AppLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Architecture Analysis</h1>
          <p className="text-muted-foreground">Project structure and dependency insights</p>
        </div>

        {/* Health Ring Section */}
        <div className="glass-dark rounded-lg border border-border p-8">
          <HealthRing
            score={mockArchitectureData.healthScore}
            pattern={mockArchitectureData.pattern}
            scalability={mockArchitectureData.scalability}
            size={140}
            strokeWidth={8}
          />
        </div>

        {/* Tabs */}
        <TabNavigation tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Issues Tab */}
        {activeTab === 'Issues' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">Filter by Severity</h2>
              <SeverityChips
                selectedSeverities={selectedSeverities}
                onSeverityChange={setSelectedSeverities}
              />
            </div>

            <div className="space-y-4">
              {filteredIssues.map((issue) => (
                <IssueAccordion key={issue.id} issue={issue} />
              ))}
            </div>

            {filteredIssues.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No issues found with selected filters</p>
              </div>
            )}
          </div>
        )}

        {/* God Files Tab */}
        {activeTab === 'God Files' && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Large Files ({mockArchitectureData.godFiles.length})
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Files that exceed recommended size limits and have high coupling. Consider breaking them into smaller modules.
            </p>
            <GodFilesChart files={mockArchitectureData.godFiles} />
          </div>
        )}

        {/* Cycles Tab */}
        {activeTab === 'Cycles' && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Circular Dependencies ({mockArchitectureData.cycles.length})
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              These circular dependencies violate the acyclic dependency principle and should be resolved.
            </p>
            <CycleVisualization cycles={mockArchitectureData.cycles} />
          </div>
        )}

        {/* Coupling Tab */}
        {activeTab === 'Coupling' && (
          <div className="glass-dark rounded-lg border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Coupling Analysis</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Coupling analysis shows the dependencies between modules. Lower coupling generally indicates better design.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-secondary/50 p-4">
                <p className="text-xs text-muted-foreground mb-1">Average Coupling</p>
                <p className="text-2xl font-bold text-foreground">3.2</p>
              </div>
              <div className="rounded-lg bg-secondary/50 p-4">
                <p className="text-xs text-muted-foreground mb-1">Max Coupling</p>
                <p className="text-2xl font-bold text-foreground">12</p>
              </div>
            </div>
          </div>
        )}

        {/* External Tab */}
        {activeTab === 'External' && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">External Dependencies</h2>
            <div className="space-y-2">
              {mockArchitectureData.externalDependencies.map((dep) => (
                <div
                  key={dep.name}
                  className="glass-dark rounded-lg border border-border p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-foreground">{dep.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {dep.type} • {dep.version}
                    </p>
                  </div>
                  {dep.vulnerabilities > 0 && (
                    <div className="px-2 py-1 rounded bg-[#E85D75]/20 text-[#E85D75] text-xs font-semibold">
                      {dep.vulnerabilities} vulnerable
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
