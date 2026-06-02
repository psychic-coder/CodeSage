'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/app-layout'
import { ProjectCard } from '@/components/project-card'
import { NewProjectCard } from '@/components/new-project-card'
import { MOCK_PROJECTS, type Project } from '@/lib/mock-projects'

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS)

  const handleViewProject = (projectId: string) => {
    // In a real app, this would set a context or URL param
    router.push(`/overview?projectId=${projectId}`)
  }

  const handleDeleteProject = (projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId))
  }

  const handleProjectAdded = (projectName: string) => {
    const newProject: Project = {
      id: `project-${Date.now()}`,
      name: projectName,
      languages: [
        { name: 'TypeScript', percentage: 100, color: 'bg-blue-500' },
      ],
      lastAnalyzed: new Date(),
      health: 0,
      filesCount: 0,
    }

    setProjects((prev) => [...prev, newProject])
  }

  return (
    <AppLayout>
      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-foreground">Projects</h1>
          <p className="text-base text-muted-foreground">
            Select a project to analyze its codebase with AI-powered insights
          </p>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, index) => (
            <ProjectCard
              key={project.id}
              {...project}
              staggerIndex={Math.min(index + 1, 10) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10}
              onView={handleViewProject}
              onDelete={handleDeleteProject}
            />
          ))}

          {/* New Project Card */}
          <div className="stagger-10 animate-spring-pop">
            <NewProjectCard onProjectAdded={handleProjectAdded} />
          </div>
        </div>

        {/* Empty State */}
        {projects.length === 0 && (
          <div className="text-center py-16 space-y-4">
            <p className="text-muted-foreground">No projects yet. Create your first one!</p>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
