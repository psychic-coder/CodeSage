'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Search, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const SEARCH_ITEMS = [
  { label: 'Overview', href: '/', category: 'Pages' },
  { label: 'Dependency Graph', href: '/dependency-graph', category: 'Pages' },
  { label: 'Architecture', href: '/architecture', category: 'Pages' },
  { label: 'Improvements', href: '/improvements', category: 'Pages' },
  { label: 'Impact Analysis', href: '/impact-analysis', category: 'Pages' },
  { label: 'Onboarding', href: '/onboarding', category: 'Pages' },
  { label: 'Export Report', href: '#', category: 'Actions' },
  { label: 'Copy Link', href: '#', category: 'Actions' },
  { label: 'Settings', href: '#', category: 'Actions' },
]

interface SearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Handle Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onOpenChange(true)
      }

      if (!open) return

      // Navigation keys
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % filteredItems.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const item = filteredItems[selectedIndex]
        if (item && item.href !== '#') {
          router.push(item.href)
          onOpenChange(false)
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onOpenChange(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, selectedIndex, query, onOpenChange, router])

  // Filter items based on query
  const filteredItems = query
    ? SEARCH_ITEMS.filter((item) =>
        item.label.toLowerCase().includes(query.toLowerCase())
      )
    : SEARCH_ITEMS

  // Group by category
  const groupedItems = filteredItems.reduce((acc, item) => {
    const group = acc.find((g) => g.category === item.category)
    if (group) {
      group.items.push(item)
    } else {
      acc.push({ category: item.category, items: [item] })
    }
    return acc
  }, [] as { category: string; items: typeof SEARCH_ITEMS }[])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-dark p-0 border-border shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <Input
            autoFocus
            placeholder="Search pages and actions..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            className="border-0 bg-transparent focus-visible:ring-0 text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-muted-foreground text-sm">No results found</p>
            </div>
          ) : (
            groupedItems.map((group) => (
              <div key={group.category}>
                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.category}
                </div>
                <div className="space-y-1 px-2 pb-2">
                  {group.items.map((item, idx) => {
                    const globalIndex = filteredItems.findIndex((i) => i === item)
                    const isSelected = globalIndex === selectedIndex

                    return (
                      <button
                        key={item.href}
                        onClick={() => {
                          if (item.href !== '#') {
                            router.push(item.href)
                            onOpenChange(false)
                          }
                        }}
                        className={cn(
                          'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm transition-all duration-200 text-left',
                          isSelected
                            ? 'bg-sidebar-primary/20 text-accent'
                            : 'text-foreground hover:bg-sidebar-accent/30'
                        )}
                      >
                        <span>{item.label}</span>
                        {isSelected && <ArrowRight className="w-4 h-4 text-accent" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 text-xs text-muted-foreground border-t border-border flex items-center justify-between">
          <span>Press ↑↓ to navigate, Enter to select</span>
          <span className="text-[10px]">ESC to close</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
