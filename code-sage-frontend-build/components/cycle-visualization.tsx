'use client'

interface Cycle {
  id: number
  severity: 'critical' | 'high'
  nodes: string[]
  length: number
}

interface CycleVisualizationProps {
  cycles: Cycle[]
}

const severityBorderColor = {
  critical: 'border-[#E85D75]',
  high: 'border-[#F59E0B]',
}

const severityNodeColor = {
  critical: 'bg-[#E85D75]/20 border-[#E85D75]',
  high: 'bg-[#F59E0B]/20 border-[#F59E0B]',
}

export function CycleVisualization({ cycles }: CycleVisualizationProps) {
  return (
    <div className="space-y-6">
      {cycles.map((cycle) => {
        const nodeNames = cycle.nodes.map((node) => node.split('/').pop() || node)

        return (
          <div
            key={cycle.id}
            className={`rounded-lg border-2 border-dashed p-6 ${
              severityBorderColor[cycle.severity]
            }`}
          >
            {/* Header */}
            <div className="mb-4">
              <div
                className={`inline-block px-2 py-1 rounded text-xs font-semibold uppercase ${
                  cycle.severity === 'critical'
                    ? 'bg-[#E85D75]/20 text-[#E85D75]'
                    : 'bg-[#F59E0B]/20 text-[#F59E0B]'
                }`}
              >
                {cycle.severity}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Circular dependency detected ({cycle.length} nodes)
              </p>
            </div>

            {/* Cycle chain */}
            <div className="flex items-center justify-start gap-2 overflow-x-auto pb-2">
              {nodeNames.map((name, index) => (
                <div key={`${cycle.id}-${index}`} className="flex items-center gap-2 flex-shrink-0">
                  {/* Node */}
                  <div
                    className={`px-4 py-2 rounded-full border-2 font-semibold text-sm whitespace-nowrap cycle-node ${
                      severityNodeColor[cycle.severity]
                    }`}
                  >
                    {name}
                  </div>

                  {/* Arrow (except for last node) */}
                  {index < nodeNames.length - 1 && (
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="flex-shrink-0 text-muted-foreground"
                    >
                      <path
                        d="M5 12H19"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M12 5L19 12L12 19"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
              ))}

              {/* Arrow back to first node (completing the cycle) */}
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="flex-shrink-0 text-muted-foreground opacity-50"
              >
                <path
                  d="M5 12H19"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="4,4"
                />
                <path
                  d="M12 5L19 12L12 19"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {/* Description */}
            <p className="text-xs text-muted-foreground mt-3">
              This creates a circular dependency chain that violates the acyclic dependency principle.
              Refactor to extract shared logic into a separate module.
            </p>
          </div>
        )
      })}
    </div>
  )
}
