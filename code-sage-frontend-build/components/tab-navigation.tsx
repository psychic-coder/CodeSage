'use client'

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface TabNavigationProps {
  tabs: string[]
  activeTab: string
  onTabChange: (tab: string) => void
}

export function TabNavigation({
  tabs,
  activeTab,
  onTabChange,
}: TabNavigationProps) {
  const [indicatorStyle, setIndicatorStyle] = useState<{
    width: number
    left: number
  }>({ width: 0, left: 0 })
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    const activeIndex = tabs.indexOf(activeTab)
    const activeTabRef = tabRefs.current[activeIndex]

    if (activeTabRef) {
      setIndicatorStyle({
        width: activeTabRef.offsetWidth,
        left: activeTabRef.offsetLeft,
      })
    }
  }, [activeTab, tabs])

  return (
    <div className="border-b border-border">
      <div className="relative flex gap-8">
        {tabs.map((tab, index) => (
          <button
            key={tab}
            ref={(el) => {
              tabRefs.current[index] = el
            }}
            onClick={() => onTabChange(tab)}
            className={cn(
              'px-4 py-3 text-sm font-medium transition-colors duration-200',
              activeTab === tab ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab}
          </button>
        ))}

        {/* Animated indicator */}
        <div
          className="absolute bottom-0 h-0.5 bg-accent"
          style={{
            width: `${indicatorStyle.width}px`,
            left: `${indicatorStyle.left}px`,
            transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        />
      </div>
    </div>
  )
}
