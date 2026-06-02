import { type TimelineStep } from '@/lib/mock-onboarding-data'
import { Code2 } from 'lucide-react'

interface ExecutionTimelineProps {
  steps: TimelineStep[]
}

export function ExecutionTimeline({ steps }: ExecutionTimelineProps) {
  return (
    <div className="relative">
      {/* Vertical connecting line */}
      <div className="absolute left-7 top-0 bottom-0 w-0.5 bg-gradient-to-b from-accent/80 via-accent/40 to-accent/10" />

      {/* Timeline steps */}
      <div className="space-y-8">
        {steps.map((step, idx) => (
          <div key={step.id} className="pl-24">
            {/* Step content */}
            <div className="glass-dark rounded-lg border border-border p-6 hover:border-accent/50 transition-colors duration-300">
              {/* Numbered circle (positioned absolutely left) */}
              <div className="absolute left-0 top-0 translate-x-1 translate-y-2">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center border-2 border-background shadow-lg shadow-accent/20">
                  <span className="text-lg font-bold text-black">{step.stepNumber}</span>
                </div>
              </div>

              {/* Step details */}
              <div className="space-y-3">
                {/* Function name */}
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-accent" />
                  {step.functionName}
                </h3>

                {/* File path */}
                <p className="text-sm font-mono text-muted-foreground bg-secondary/30 px-3 py-1 rounded w-fit">
                  {step.filePath}
                </p>

                {/* Description */}
                <p className="text-foreground leading-relaxed">{step.description}</p>

                {/* Code snippet if available */}
                {step.codeSnippet && (
                  <div className="bg-secondary/50 p-3 rounded border border-border/30 overflow-x-auto">
                    <pre className="text-xs font-mono text-cyan-400">{step.codeSnippet}</pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
