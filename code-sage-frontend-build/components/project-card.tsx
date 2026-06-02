'use client'

import { useState } from 'react'
import { Eye, Trash2 } from 'lucide-react'
import { LanguageBar } from './language-bar'
import { HealthBadge } from './health-badge'

interface Language {
  name: string
  percentage: number
  color: string
}

interface ProjectCardProps {
  id: string
  name: string
  languages: Language[]
  lastAnalyzed: Date
  health: number
  filesCount: number
  staggerIndex: number
  onView: (id: string) => void
  onDelete: (id: string) => void
}

export function ProjectCard({
  id,
  name,
  languages,
  lastAnalyzed,
  health,
  filesCount,
  staggerIndex,
  onView,
  onDelete,
}: ProjectCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isHovering, setIsHovering] = useState(false)

  const handleDelete = () => {
    setIsDeleting(true)
    setTimeout(() => {
      onDelete(id)
    }, 300)
  }

  const formatDate = (date: Date) => {
    const now = new Date()
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffHours < 1) return 'just now'
    if (diffHours < 24) return `${diffHours}h ago`

    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`

    const diffWeeks = Math.floor(diffDays / 7)
    if (diffWeeks < 4) return `${diffWeeks}w ago`

    return date.toLocaleDateString()
  }

  return (
    <div
      className={`glass-dark relative overflow-hidden rounded-lg border border-border p-6 transition-all duration-300 ${
        isDeleting ? 'animate-slide-out-left' : `animate-spring-pop stagger-${staggerIndex}`
      } ${isHovering ? 'border-accent/50 shadow-[0_0_30px_rgba(0,217,255,0.2)]' : ''}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Health Badge */}
      <div className="absolute top-4 right-4">
        <HealthBadge score={health} />
      </div>

      {/* Content */}
      <div className="space-y-4 pr-24">
        {/* Project Name */}
        <div>
          <h3 className="text-lg font-semibold text-foreground line-clamp-2">{name}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {filesCount.toLocaleString()} files
          </p>
        </div>

        {/* Language Bar */}
        <LanguageBar languages={languages} />

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Last analyzed</span>
          <span>{formatDate(lastAnalyzed)}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div
        className={`absolute top-4 right-4 flex gap-2 transition-all duration-200 ${
          isHovering ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          pointerEvents: isHovering ? 'auto' : 'none',
        }}
      >
        <button
          onClick={() => onView(id)}
          className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20 transition-all duration-200 hover-glow"
          title="View project"
        >
          <Eye className="w-4 h-4" />
        </button>
        <button
          onClick={handleDelete}
          className="flex items-center justify-center w-10 h-10 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive hover:bg-destructive/20 transition-all duration-200 hover:shadow-[0_0_15px_rgba(232,93,117,0.3)]"
          title="Delete project"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
