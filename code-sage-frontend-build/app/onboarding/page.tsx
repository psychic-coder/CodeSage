'use client'

import { useState } from 'react'
import { AppLayout } from '@/components/app-layout'
import { ExecutionTimeline } from '@/components/execution-timeline'
import { GotchasPanel } from '@/components/gotchas-panel'
import { PRESET_QUESTIONS, ONBOARDING_GUIDES } from '@/lib/mock-onboarding-data'
import { Copy, Check } from 'lucide-react'

export default function OnboardingPage() {
  const [query, setQuery] = useState('')
  const [selectedGuide, setSelectedGuide] = useState<string | null>(null)
  const [queryHistory, setQueryHistory] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const currentGuide = selectedGuide ? ONBOARDING_GUIDES[selectedGuide] : null

  const handlePresetQuestion = (question: string) => {
    setQuery(question)
    handleSearch(question)
  }

  const handleSearch = (searchQuery: string) => {
    setIsLoading(true)
    setQuery(searchQuery)

    // Simulate API call delay
    setTimeout(() => {
      const guideKey = Object.keys(ONBOARDING_GUIDES).find(
        (key) => ONBOARDING_GUIDES[key].query.toLowerCase() === searchQuery.toLowerCase()
      )

      if (guideKey) {
        setSelectedGuide(guideKey)
        if (!queryHistory.includes(searchQuery)) {
          setQueryHistory((prev) => [searchQuery, ...prev].slice(0, 10))
        }
      }
      setIsLoading(false)
    }, 800)
  }

  const handleCopyMarkdown = () => {
    if (!currentGuide) return

    const markdown = `# ${currentGuide.title}

${currentGuide.description}

## Execution Flow

${currentGuide.timelineSteps
  .map(
    (step) => `
### Step ${step.stepNumber}: ${step.functionName}

**File:** \`${step.filePath}\`

${step.description}

\`\`\`javascript
${step.codeSnippet || ''}
\`\`\`
`
  )
  .join('\n')}

## Gotchas & Pitfalls

${currentGuide.gotchas.map((g) => `- ${g}`).join('\n')}
`

    navigator.clipboard.writeText(markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <AppLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Interactive Onboarding Guide</h1>
          <p className="text-muted-foreground">Ask questions about your codebase and get detailed execution flows</p>
        </div>

        {/* Main Input Area */}
        <div className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && query.trim()) {
                  handleSearch(query)
                }
              }}
              placeholder="What do you want to know about this codebase?"
              className="w-full px-6 py-4 bg-secondary/30 border-2 border-accent/30 rounded-lg text-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 transition-all duration-300"
            />
            {query && (
              <button
                onClick={() => handleSearch(query)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 px-4 py-2 bg-accent/30 hover:bg-accent/50 text-accent rounded-md text-sm font-semibold transition-colors"
              >
                Search
              </button>
            )}
          </div>

          {/* Preset Questions */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Try these questions:</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_QUESTIONS.map((question) => (
                <button
                  key={question}
                  onClick={() => handlePresetQuestion(question)}
                  className="px-3 py-1 text-sm rounded-full bg-secondary/50 border border-border/50 text-foreground hover:bg-secondary hover:border-accent/50 transition-all duration-200"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar - Query History */}
          <div className="lg:col-span-1">
            <div className="glass-dark rounded-lg border border-border p-4 sticky top-20">
              <h2 className="text-sm font-semibold text-foreground mb-3">Query History</h2>
              {queryHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No queries yet. Ask something to get started!</p>
              ) : (
                <div className="space-y-2">
                  {queryHistory.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setQuery(item)
                        handleSearch(item)
                      }}
                      className={`w-full text-left text-xs p-2 rounded transition-colors duration-200 ${
                        query === item
                          ? 'bg-accent/20 text-accent border border-accent/50'
                          : 'bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                      }`}
                    >
                      {item.substring(0, 30)}...
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="glass-dark rounded-lg border border-border p-6 animate-pulse">
                    <div className="h-6 bg-secondary/50 rounded w-3/4 mb-3" />
                    <div className="h-4 bg-secondary/50 rounded w-1/2 mb-2" />
                    <div className="h-4 bg-secondary/50 rounded w-full" />
                  </div>
                ))}
              </div>
            ) : currentGuide ? (
              <div className="space-y-8">
                {/* Top Actions */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">{currentGuide.title}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{currentGuide.description}</p>
                  </div>
                  <button
                    onClick={handleCopyMarkdown}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                      copied
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-accent/20 text-accent hover:bg-accent/30'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy as Markdown
                      </>
                    )}
                  </button>
                </div>

                {/* Execution Timeline */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-6">Execution Flow</h3>
                  <ExecutionTimeline steps={currentGuide.timelineSteps} />
                </div>

                {/* Gotchas Panel */}
                <GotchasPanel gotchas={currentGuide.gotchas} />
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Enter a question or select from the preset options above to get started</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
