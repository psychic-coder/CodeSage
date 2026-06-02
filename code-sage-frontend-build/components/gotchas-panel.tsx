import { AlertTriangle } from 'lucide-react'

interface GotchasPanelProps {
  gotchas: string[]
}

export function GotchasPanel({ gotchas }: GotchasPanelProps) {
  return (
    <div className="border-l-4 border-l-[#F59E0B] bg-[#F59E0B]/10 p-6 rounded-lg">
      <div className="flex items-start gap-4">
        <AlertTriangle className="w-6 h-6 text-[#F59E0B] flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <span>Common Gotchas & Pitfalls</span>
          </h3>
          <ul className="space-y-2">
            {gotchas.map((gotcha, idx) => (
              <li key={idx} className="flex gap-3 text-sm text-foreground">
                <span className="text-[#F59E0B] font-bold min-w-fit">⚠</span>
                <span>{gotcha}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
