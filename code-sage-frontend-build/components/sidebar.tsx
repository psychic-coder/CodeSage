'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Zap, GitBranch, Box, Lightbulb, Activity, BookOpen, Grid3x3 } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { label: 'Projects', href: '/projects', icon: Grid3x3 },
  { label: 'Overview', href: '/', icon: Zap },
  { label: 'Dependency Graph', href: '/dependency-graph', icon: GitBranch },
  { label: 'Architecture', href: '/architecture', icon: Box },
  { label: 'Improvements', href: '/improvements', icon: Lightbulb },
  { label: 'Impact Analysis', href: '/impact-analysis', icon: Activity },
  { label: 'Onboarding', href: '/onboarding', icon: BookOpen },
]

interface SidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function Sidebar({ open, onOpenChange }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'glass-dark flex flex-col border-r border-border transition-all duration-300 ease-spring',
        open ? 'w-64' : 'w-20'
      )}
    >
      {/* Sidebar header with logo */}
      <div className="flex items-center justify-between p-4 h-16 border-b border-border">
        {open && <div className="text-lg font-bold text-accent">CodeSage</div>}
        <button
          onClick={() => onOpenChange(!open)}
          className="p-2 hover:bg-sidebar-accent rounded-md transition-colors duration-200 text-muted-foreground hover:text-foreground"
          aria-label="Toggle sidebar"
        >
          {open ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className="group relative"
            >
              <div
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 relative z-10',
                  isActive
                    ? 'text-accent font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {/* Animated active background pill */}
                {isActive && (
                  <div className="absolute inset-0 bg-sidebar-primary/15 rounded-md animate-spring-pop -z-10" />
                )}

                <Icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-accent')} />
                {open && <span className="text-sm font-medium truncate">{item.label}</span>}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-2">
        <button className="w-full px-3 py-2 text-sm rounded-md bg-sidebar-accent/50 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors duration-200">
          {open ? 'Feedback' : '?'}
        </button>
      </div>
    </aside>
  )
}
