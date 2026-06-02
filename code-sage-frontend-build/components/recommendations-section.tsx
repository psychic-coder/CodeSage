import { Plus, Edit } from 'lucide-react'
import type { Recommendation } from '@/lib/mock-improvements-data'

interface RecommendationsSectionProps {
  recommendations: Recommendation[]
}

export function RecommendationsSection({ recommendations }: RecommendationsSectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Feature Ideas & Recommendations</h2>
        <p className="text-muted-foreground">Suggested improvements to enhance your codebase</p>
      </div>

      <div className="space-y-4">
        {recommendations.map((rec) => (
          <div key={rec.id} className="glass-dark rounded-lg border border-border p-6 hover-glow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">{rec.title}</h3>
                <p className="text-sm text-muted-foreground">{rec.description}</p>
              </div>
              <div
                className={`px-3 py-1 rounded text-xs font-semibold whitespace-nowrap ${
                  rec.complexity === 'Low'
                    ? 'complexity-badge complexity-low'
                    : 'complexity-badge complexity-high'
                }`}
              >
                {rec.complexity} Complexity
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Files to Create */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Plus className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-semibold text-foreground">Files to Create</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {rec.filesToCreate.map((file) => (
                    <span
                      key={file}
                      className="terminal-tag terminal-tag-create"
                    >
                      <Plus className="w-3 h-3" />
                      {file}
                    </span>
                  ))}
                </div>
              </div>

              {/* Files to Modify */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Edit className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-semibold text-foreground">Files to Modify</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {rec.filesToModify.map((file) => (
                    <span
                      key={file}
                      className="terminal-tag terminal-tag-modify"
                    >
                      <Edit className="w-3 h-3" />
                      {file}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
