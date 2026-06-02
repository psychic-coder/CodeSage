'use client'

import { useState, useRef } from 'react'
import { Shield, Zap, RefreshCw, AlertTriangle } from 'lucide-react'
import type { ImprovementCategory } from '@/lib/mock-improvements-data'

interface CategoryFilterProps {
  selectedCategories: ImprovementCategory[]
  onCategoryChange: (categories: ImprovementCategory[]) => void
}

const CATEGORIES: { value: ImprovementCategory; label: string; icon: any; color: string }[] = [
  { value: 'security', label: 'Security', icon: Shield, color: '#3B82F6' },
  { value: 'performance', label: 'Performance', icon: Zap, color: '#F59E0B' },
  { value: 'refactoring', label: 'Refactoring', icon: RefreshCw, color: '#A855F7' },
  { value: 'critical', label: 'Critical', icon: AlertTriangle, color: '#E85D75' },
]

export function CategoryFilter({ selectedCategories, onCategoryChange }: CategoryFilterProps) {
  const [ripples, setRipples] = useState<{ id: string; x: number; y: number }[]>([])

  const handleCategoryClick = (category: ImprovementCategory, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const rippleId = Math.random().toString(36)
    setRipples((prev) => [...prev, { id: rippleId, x, y }])
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== rippleId))
    }, 600)

    if (selectedCategories.includes(category)) {
      onCategoryChange(selectedCategories.filter((c) => c !== category))
    } else {
      onCategoryChange([...selectedCategories, category])
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIES.map((category) => {
        const Icon = category.icon
        const isSelected = selectedCategories.includes(category.value)

        return (
          <button
            key={category.value}
            onClick={(e) => handleCategoryClick(category.value, e)}
            className={`relative inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all duration-300 overflow-hidden ${
              isSelected
                ? 'glass-dark border'
                : 'bg-secondary/30 border border-border hover:border-border'
            }`}
            style={{
              borderColor: isSelected ? category.color : undefined,
              backgroundColor: isSelected ? `${category.color}20` : undefined,
              boxShadow: isSelected ? `0 0 20px ${category.color}30` : undefined,
            }}
          >
            <Icon className="w-4 h-4" style={{ color: category.color }} />
            <span style={{ color: isSelected ? category.color : undefined }}>{category.label}</span>

            {/* Ripple effect */}
            {ripples.map((ripple) => (
              <div
                key={ripple.id}
                className="ripple"
                style={{
                  left: ripple.x,
                  top: ripple.y,
                  width: 20,
                  height: 20,
                  backgroundColor: category.color,
                }}
              />
            ))}
          </button>
        )
      })}
    </div>
  )
}
