export interface Project {
  id: string
  name: string
  languages: {
    name: string
    percentage: number
    color: string
  }[]
  lastAnalyzed: Date
  health: number
  filesCount: number
}

export const MOCK_PROJECTS: Project[] = [
  {
    id: '1',
    name: 'Next.js E-Commerce Platform',
    languages: [
      { name: 'TypeScript', percentage: 65, color: 'bg-blue-500' },
      { name: 'JavaScript', percentage: 20, color: 'bg-yellow-500' },
      { name: 'CSS', percentage: 10, color: 'bg-pink-500' },
      { name: 'SQL', percentage: 5, color: 'bg-green-500' },
    ],
    lastAnalyzed: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    health: 8.7,
    filesCount: 2847,
  },
  {
    id: '2',
    name: 'React Native Mobile App',
    languages: [
      { name: 'TypeScript', percentage: 75, color: 'bg-blue-500' },
      { name: 'JavaScript', percentage: 15, color: 'bg-yellow-500' },
      { name: 'Java', percentage: 10, color: 'bg-orange-500' },
    ],
    lastAnalyzed: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    health: 9.1,
    filesCount: 1562,
  },
  {
    id: '3',
    name: 'Python Data Pipeline',
    languages: [
      { name: 'Python', percentage: 80, color: 'bg-green-500' },
      { name: 'SQL', percentage: 15, color: 'bg-blue-600' },
      { name: 'Bash', percentage: 5, color: 'bg-gray-600' },
    ],
    lastAnalyzed: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    health: 7.4,
    filesCount: 843,
  },
  {
    id: '4',
    name: 'Cloud Infrastructure Monorepo',
    languages: [
      { name: 'TypeScript', percentage: 40, color: 'bg-blue-500' },
      { name: 'Go', percentage: 35, color: 'bg-cyan-500' },
      { name: 'YAML', percentage: 15, color: 'bg-purple-500' },
      { name: 'Terraform', percentage: 10, color: 'bg-indigo-500' },
    ],
    lastAnalyzed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    health: 8.2,
    filesCount: 4521,
  },
  {
    id: '5',
    name: 'Embedded Systems Firmware',
    languages: [
      { name: 'C', percentage: 55, color: 'bg-red-500' },
      { name: 'C++', percentage: 30, color: 'bg-red-600' },
      { name: 'Assembly', percentage: 15, color: 'bg-gray-700' },
    ],
    lastAnalyzed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
    health: 6.8,
    filesCount: 2134,
  },
  {
    id: '6',
    name: 'GraphQL API Gateway',
    languages: [
      { name: 'JavaScript', percentage: 60, color: 'bg-yellow-500' },
      { name: 'TypeScript', percentage: 30, color: 'bg-blue-500' },
      { name: 'GraphQL', percentage: 10, color: 'bg-pink-600' },
    ],
    lastAnalyzed: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    health: 8.9,
    filesCount: 1247,
  },
  {
    id: '7',
    name: 'Machine Learning Pipeline',
    languages: [
      { name: 'Python', percentage: 85, color: 'bg-green-500' },
      { name: 'R', percentage: 10, color: 'bg-blue-700' },
      { name: 'Julia', percentage: 5, color: 'bg-purple-600' },
    ],
    lastAnalyzed: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
    health: 7.6,
    filesCount: 1893,
  },
  {
    id: '8',
    name: 'Vue.js Admin Dashboard',
    languages: [
      { name: 'Vue', percentage: 50, color: 'bg-green-600' },
      { name: 'JavaScript', percentage: 25, color: 'bg-yellow-500' },
      { name: 'TypeScript', percentage: 15, color: 'bg-blue-500' },
      { name: 'CSS', percentage: 10, color: 'bg-pink-500' },
    ],
    lastAnalyzed: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    health: 8.4,
    filesCount: 1456,
  },
]
