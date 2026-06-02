'use client'

import { useState, useMemo } from 'react'
import { AppLayout } from '@/components/app-layout'
import { StatsBar } from '@/components/stats-bar'
import { CategoryFilter } from '@/components/category-filter'
import { ImprovementCard } from '@/components/improvement-card'
import { RecommendationsSection } from '@/components/recommendations-section'
import { IMPROVEMENTS, RECOMMENDATIONS, STATS } from '@/lib/mock-improvements-data'
import type { ImprovementCategory } from '@/lib/mock-improvements-data'

export default function ImprovementsPage() {
  const [selectedCategories, setSelectedCategories] = useState<ImprovementCategory[]>([
    'security',
    'performance',
    'refactoring',
    'critical',
  ])

  const filteredImprovements = useMemo(() => {
    return IMPROVEMENTS.filter((imp) => selectedCategories.includes(imp.category))
  }, [selectedCategories])

  return (
    <AppLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Improvements</h1>
          <p className="text-muted-foreground">AI-suggested enhancements and optimizations for your codebase</p>
        </div>

        {/* Stats Bar */}
        <StatsBar stats={STATS} />

        {/* Category Filter */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Filter by Category</h2>
          <CategoryFilter selectedCategories={selectedCategories} onCategoryChange={setSelectedCategories} />
        </div>

        {/* Improvements Grid */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Improvements ({filteredImprovements.length})</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredImprovements.map((improvement) => (
              <ImprovementCard key={improvement.id} improvement={improvement} />
            ))}
          </div>

          {filteredImprovements.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No improvements found with selected filters</p>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-border/30 pt-8" />

        {/* Recommendations Section */}
        <RecommendationsSection recommendations={RECOMMENDATIONS} />
      </div>
    </AppLayout>
  )
}
