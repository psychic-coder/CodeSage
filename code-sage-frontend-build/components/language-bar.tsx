'use client'

import { useState } from 'react'

interface Language {
  name: string
  percentage: number
  color: string
}

interface LanguageBarProps {
  languages: Language[]
}

export function LanguageBar({ languages }: LanguageBarProps) {
  const [hoveredLang, setHoveredLang] = useState<string | null>(null)

  return (
    <div className="space-y-2">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary/50">
        {languages.map((lang, index) => (
          <div
            key={lang.name}
            className={`relative language-segment animate-fill-bar transition-all duration-300 ${lang.color} ${
              hoveredLang && hoveredLang !== lang.name ? 'opacity-60' : 'opacity-100'
            }`}
            style={{
              width: `${lang.percentage}%`,
              animationDelay: `${index * 0.1}s`,
            }}
            onMouseEnter={() => setHoveredLang(lang.name)}
            onMouseLeave={() => setHoveredLang(null)}
            title={`${lang.name}: ${lang.percentage}%`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {languages.map((lang) => (
          <div key={lang.name} className="flex items-center gap-1 text-xs">
            <div className={`w-2 h-2 rounded-full ${lang.color}`} />
            <span className="text-muted-foreground">
              {lang.name} {lang.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
