'use client'

import { usePathname } from 'next/navigation'
import { Menu, Search } from 'lucide-react'
import { useEffect, useState } from 'react'

interface HeaderProps {
  onToggleSidebar: () => void
  onOpenSearch: () => void
}

export function Header({ onToggleSidebar, onOpenSearch }: HeaderProps) {
  const pathname = usePathname()
  const [breadcrumbs, setBreadcrumbs] = useState<{ label: string; href: string }[]>([])

  useEffect(() => {
    // Generate breadcrumbs from pathname
    const segments = pathname.split('/').filter(Boolean)
    const crumbs = [{ label: 'Projects', href: '/' }]

    if (segments.length > 0) {
      crumbs.push({ label: 'CodeSage', href: '/' })

      segments.forEach((segment, index) => {
        const label = segment
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
        const href = '/' + segments.slice(0, index + 1).join('/')
        crumbs.push({ label, href })
      })
    }

    setBreadcrumbs(crumbs)
  }, [pathname])

  return (
    <header className="glass sticky top-0 z-20 h-16 border-b border-border px-6 flex items-center justify-between">
      {/* Left section - Breadcrumbs */}
      <div className="flex items-center gap-2">
        <nav className="flex items-center gap-2 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.href} className="flex items-center gap-2">
              {index > 0 && <span className="text-muted-foreground">/</span>}
              <a
                href={crumb.href}
                className="text-muted-foreground hover:text-foreground transition-colors duration-200 hover-glow"
              >
                {crumb.label}
              </a>
            </div>
          ))}
        </nav>
      </div>

      {/* Right section - Search */}
      <button
        onClick={onOpenSearch}
        className="ml-auto flex items-center gap-2 px-3 py-2 rounded-md bg-sidebar-accent/30 border border-border hover:bg-sidebar-accent/50 transition-colors duration-200 text-muted-foreground hover:text-foreground group"
        aria-label="Open search"
      >
        <Search className="w-4 h-4" />
        <span className="text-sm hidden sm:inline">Search...</span>
        <span className="hidden sm:inline text-xs text-muted-foreground ml-2">⌘K</span>
      </button>
    </header>
  )
}
