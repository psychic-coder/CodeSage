'use client'

import { useEffect, useRef, useState } from 'react'

interface HealthRingProps {
  score: number
  pattern: string
  scalability: string
  size?: number
  strokeWidth?: number
}

export function HealthRing({
  score,
  pattern,
  scalability,
  size = 120,
  strokeWidth = 8,
}: HealthRingProps) {
  const [displayScore, setDisplayScore] = useState(0)
  const svgRef = useRef<SVGCircleElement>(null)
  const textRef = useRef<HTMLDivElement>(null)

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  useEffect(() => {
    const animationDuration = 1500
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / animationDuration, 1)

      // Easing: easeOutQuad
      const eased = 1 - Math.pow(1 - progress, 2)
      const currentScore = Math.round(score * eased)
      setDisplayScore(currentScore)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    animate()
  }, [score])

  useEffect(() => {
    if (svgRef.current) {
      const strokeDashoffset = circumference - (displayScore / 10) * circumference
      svgRef.current.style.strokeDashoffset = `${strokeDashoffset}`
    }
  }, [displayScore, circumference])

  const getColor = (score: number) => {
    if (score >= 8) return '#10B981'
    if (score >= 5) return '#F59E0B'
    return '#E85D75'
  }

  return (
    <div className="flex items-center gap-8">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth={strokeWidth}
          />
          {/* Animated circle */}
          <circle
            ref={svgRef}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={getColor(score)}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeLinecap="round"
            className="transition-all duration-300"
          />
        </svg>

        {/* Score text in center */}
        <div
          ref={textRef}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground">
              {displayScore.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">/10</div>
          </div>
        </div>
      </div>

      {/* Pattern and Scalability */}
      <div className="space-y-2">
        <div>
          <p className="text-xs text-muted-foreground">Architecture Pattern</p>
          <p className="text-lg font-semibold text-foreground">{pattern}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Scalability</p>
          <p className="text-lg font-semibold text-foreground">{scalability}</p>
        </div>
      </div>
    </div>
  )
}
