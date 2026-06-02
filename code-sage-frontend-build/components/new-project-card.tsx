'use client'

import { useState, useRef } from 'react'
import { Plus, Upload, Github, X } from 'lucide-react'

interface NewProjectCardProps {
  onProjectAdded: (projectName: string) => void
}

export function NewProjectCard({ onProjectAdded }: NewProjectCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [githubUrl, setGithubUrl] = useState('')
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'dragging' | 'uploading' | 'success'>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.name.endsWith('.zip')) {
        handleFileUpload(file)
      } else {
        alert('Please drop a ZIP file')
      }
    }
  }

  const handleFileUpload = (file: File) => {
    setUploadStatus('uploading')

    // Simulate upload
    setTimeout(() => {
      setUploadStatus('success')
      const projectName = file.name.replace('.zip', '')
      onProjectAdded(projectName)

      setTimeout(() => {
        setIsModalOpen(false)
        setUploadStatus('idle')
      }, 500)
    }, 1500)
  }

  const handleGithubSubmit = () => {
    if (githubUrl.trim()) {
      setUploadStatus('uploading')

      // Simulate GitHub import
      setTimeout(() => {
        setUploadStatus('success')
        const projectName = githubUrl.split('/').pop()?.replace('.git', '') || 'New Project'
        onProjectAdded(projectName)

        setTimeout(() => {
          setIsModalOpen(false)
          setGithubUrl('')
          setUploadStatus('idle')
        }, 500)
      }, 1500)
    }
  }

  return (
    <>
      <div
        className={`group relative overflow-hidden rounded-lg border-2 border-dashed transition-all duration-300 ${
          isHovering
            ? 'border-accent/80 bg-accent/5 shadow-[0_0_30px_rgba(0,217,255,0.2)]'
            : 'border-accent/30 bg-transparent'
        } cursor-pointer`}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={() => setIsModalOpen(true)}
      >
        {/* Rotating gradient border effect */}
        {isHovering && (
          <div className="absolute inset-0 rounded-lg border-2 border-dashed border-transparent bg-gradient-to-r from-accent/50 via-transparent to-accent/50 animate-gradient-border opacity-50" />
        )}

        {/* Content */}
        <div className="relative flex flex-col items-center justify-center h-64 gap-4 p-6">
          <div
            className={`transition-all duration-300 ${isHovering ? 'scale-110 text-accent' : 'text-muted-foreground'}`}
          >
            <Plus className="w-12 h-12" />
          </div>

          <div className="text-center space-y-2">
            <h3 className={`font-semibold transition-colors duration-300 ${isHovering ? 'text-foreground' : 'text-foreground/70'}`}>
              Add New Project
            </h3>
            <p className="text-xs text-muted-foreground">
              Paste GitHub URL or drag & drop a ZIP file
            </p>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-dark rounded-lg border border-border max-w-md w-full animate-spring-pop space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Add New Project</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadStatus === 'uploading' ? (
              <div className="flex flex-col items-center justify-center gap-4 py-8">
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 border-2 border-transparent border-t-accent border-r-accent rounded-full animate-spin" />
                </div>
                <p className="text-sm text-muted-foreground">Processing your project...</p>
              </div>
            ) : uploadStatus === 'success' ? (
              <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                  <div className="w-6 h-6 text-green-400">✓</div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Project added successfully!</p>
                  <p className="text-xs text-muted-foreground mt-1">Redirecting to analysis...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* GitHub URL Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Github className="w-4 h-4" />
                    GitHub Repository URL
                  </label>
                  <input
                    type="text"
                    placeholder="https://github.com/username/repo"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleGithubSubmit()}
                    className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
                  />
                  <button
                    onClick={handleGithubSubmit}
                    disabled={!githubUrl.trim()}
                    className="w-full px-3 py-2 rounded-lg bg-accent text-accent-foreground font-medium text-sm hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Import from GitHub
                  </button>
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-card text-muted-foreground">or</span>
                  </div>
                </div>

                {/* Drag and Drop Zone */}
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
                    isDragging ? 'border-accent/80 bg-accent/5' : 'border-border/50 hover:border-border'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Upload className={`w-6 h-6 transition-colors ${isDragging ? 'text-accent' : 'text-muted-foreground'}`} />
                    <div>
                      <p className="text-sm font-medium text-foreground">Drop ZIP file here</p>
                      <p className="text-xs text-muted-foreground mt-1">or</p>
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-accent hover:text-accent/80 underline transition-colors"
                    >
                      browse files
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".zip"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleFileUpload(e.target.files[0])
                      }
                    }}
                    className="hidden"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
