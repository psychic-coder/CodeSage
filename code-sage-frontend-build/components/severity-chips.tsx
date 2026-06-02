'use client'

import { cn } from '@/lib/utils'

type Severity = 'Critical' | 'High' | 'Medium' | 'Low'

interface SeverityChipsProps {
  selectedSeverities: Severity[]
  onSeverityChange: (severities: Severity[]) => void
}

const SEVERITIES: { label: Severity; color: string; bgColor: string }[] = [
  {
    label: 'Critical',
    color: 'text-[#E85D75]',
    bgColor: 'bg-[#E85D75]/10 border-[#E85D75]/30 hover:bg-[#E85D75]/20',
  },
  {
    label: 'High',
    color: 'text-[#F59E0B]',
    bgColor: 'bg-[#F59E0B]/10 border-[#F59E0B]/30 hover:bg-[#F59E0B]/20',
  },
  {
    label: 'Medium',
    color: 'text-[#FBBF24]',
    bgColor: 'bg-[#FBBF24]/10 border-[#FBBF24]/30 hover:bg-[#FBBF24]/20',
  },
  {
    label: 'Low',
    color: 'text-[#3B82F6]',
    bgColor: 'bg-[#3B82F6]/10 border-[#3B82F6]/30 hover:bg-[#3B82F6]/20',
  },
]

export function SeverityChips({
  selectedSeverities,
  onSeverityChange,
}: SeverityChipsProps) {
  const toggleSeverity = (severity: Severity) => {
    if (selectedSeverities.includes(severity)) {
      onSeverityChange(selectedSeverities.filter((s) => s !== severity))
    } else {
      onSeverityChange([...selectedSeverities, severity])
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {SEVERITIES.map(({ label, bgColor }) => (
        <button
          key={label}
          onClick={() => toggleSeverity(label)}
          className={cn(
            'px-3 py-1.5 rounded-full border transition-all duration-200 text-sm font-medium',
            selectedSeverities.includes(label)
              ? `${bgColor} opacity-100`
              : 'bg-secondary/50 border-border text-muted-foreground hover:text-foreground'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
