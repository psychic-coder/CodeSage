import { formatDistanceToNowStrict } from "date-fns";
import type { Project } from "@/types";

export type ProjectSegment = {
  name: string;
  percentage: number;
  color: string;
};

export type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon: string;
};

export const projectNavItems: NavItem[] = [
  { href: "", label: "Overview", shortLabel: "Overview", icon: "◌" },
  { href: "graph", label: "Dependency Graph", shortLabel: "Graph", icon: "⋯" },
  { href: "architecture", label: "Architecture", shortLabel: "Architecture", icon: "⌬" },
  { href: "improvements", label: "Improvements", shortLabel: "Improvements", icon: "✦" },
  { href: "impact", label: "Impact Analysis", shortLabel: "Impact", icon: "↯" },
  { href: "onboarding", label: "Onboarding", shortLabel: "Onboarding", icon: "→" },
];

export const presetQuestions = [
  "How does authentication work?",
  "What files change when I add billing?",
  "Where are the major architecture risks?",
  "Which files are the current god files?",
  "Show me the execution flow for onboarding.",
];

const SEGMENT_COLORS = ["#60A5FA", "#22D3EE", "#A78BFA", "#F59E0B", "#34D399", "#FB7185"];

export function formatProjectTime(value: string | Date | null | undefined) {
  if (!value) return "just now";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "just now";
  return formatDistanceToNowStrict(date, { addSuffix: true });
}

export function getProjectHealth(project: Project) {
  const fileScore = Math.min(project.total_files / 55, 24);
  const graphScore = Math.min(project.total_edges / 65, 18);
  const maturityScore = project.status === "ready" ? 24 : project.status === "processing" ? 12 : 8;
  const languageScore = project.primary_language ? 18 : 10;
  const freshnessScore = Math.max(0, 20 - Math.min(20, Math.abs(new Date(project.updated_at).getTime() - Date.now()) / (1000 * 60 * 60 * 12)));
  return Math.max(18, Math.min(98, Math.round(fileScore + graphScore + maturityScore + languageScore + freshnessScore)));
}

export function getProjectSegments(project: Project): ProjectSegment[] {
  const primary = project.primary_language || "TypeScript";
  const secondary = primary === "Python" ? "TypeScript" : "Python";
  const tertiary = primary === "TypeScript" ? "CSS" : "TypeScript";
  const total = Math.max(project.total_files || 1000, 1);
  const primaryShare = Math.min(68, Math.max(42, Math.round((project.total_nodes / total) * 140)));
  const secondaryShare = Math.max(12, 100 - primaryShare - 18);
  const tertiaryShare = Math.max(8, 18);
  return [
    { name: primary, percentage: primaryShare, color: SEGMENT_COLORS[0] },
    { name: secondary, percentage: secondaryShare, color: SEGMENT_COLORS[1] },
    { name: tertiary, percentage: tertiaryShare, color: SEGMENT_COLORS[2] },
  ].filter((segment, index, segments) => segment.percentage > 0 && segments.findIndex((item) => item.name === segment.name) === index);
}

export function projectAccent(project: Project) {
  const score = getProjectHealth(project);
  if (score >= 84) return "#34D399";
  if (score >= 68) return "#22D3EE";
  if (score >= 52) return "#F59E0B";
  return "#FB7185";
}

export function unwrapAnalysis<T>(payload: any): T {
  return (payload?.data?.data ?? payload?.data ?? payload ?? null) as T;
}

export function normalizeList<T>(value: T[] | undefined | null, fallback: T[] = []): T[] {
  return Array.isArray(value) && value.length ? value : fallback;
}

export const architectureFallback = {
  overall_health_score: 74,
  health_label: "Stable but coupled",
  architecture_pattern: "Hybrid modular monolith",
  scalability_assessment: "Good module boundaries, but a few shared services are carrying too much surface area.",
  strengths: [
    "Clear separation between Next.js UI and Python workers",
    "API routes are mostly thin and delegate into services",
    "Graph queries are cached and split from synthesis",
  ],
  findings: {
    circular_deps: [["app/api/v1/router.py", "app/services/intelligence/*.py", "app/api/v1/router.py"]],
    god_files: [
      { path: "backend/app/services/intelligence/architecture_analyzer.py", in_degree: 18, out_degree: 24 },
      { path: "frontend/app/dashboard/[projectId]/graph/page.tsx", in_degree: 14, out_degree: 17 },
    ],
    tight_coupling: [{ file_a: "frontend/lib/api.ts", file_b: "frontend/app/dashboard/page.tsx" }],
    isolated_files: ["backend/app/vendor/legacy_parser.py", "frontend/components/ui/toast.tsx"],
    external_deps: [
      { name: "neo4j", usage: 42 },
      { name: "redis", usage: 31 },
      { name: "celery", usage: 27 },
    ],
  },
  issues: [
    {
      type: "tight-coupling",
      severity: "high",
      title: "Shared analysis services are becoming central choke points",
      description: "The architecture analysis and synthesis layers are repeatedly referenced by orchestration paths, which raises maintenance cost.",
      involved_files: ["backend/app/services/intelligence/architecture_analyzer.py", "backend/app/services/intelligence/improvement_suggester.py"],
      suggested_fix: "Extract shared scoring and serialization helpers into a dedicated analysis utility module.",
    },
    {
      type: "god-file",
      severity: "medium",
      title: "One UI page is doing too much coordination",
      description: "The graph page manages filters, focus logic, and rendering in the same component tree.",
      involved_files: ["frontend/app/dashboard/[projectId]/graph/page.tsx"],
      suggested_fix: "Move graph normalization and focus logic into a custom hook and preserve only presentational state in the page.",
    },
  ],
};

export const improvementFallback = {
  stats: {
    security: 12,
    performance: 19,
    refactoring: 21,
    critical: 4,
  },
  improvements: [
    {
      id: "imp-1",
      category: "security",
      severity: "critical",
      title: "Tighten auth token handling in the Next.js shell",
      file: "frontend/lib/api.ts",
      line_range: [1, 42],
      code_snippet: "sessionStorage.getItem(\"codesage_token\")",
      explanation: "Bearer token loading is centralized, but it still relies on a browser-only store and redirects silently on 401.",
      suggested_fix: "Move token state into an explicit auth provider and surface failed refresh states in the UI.",
      effort: "medium",
    },
    {
      id: "imp-2",
      category: "performance",
      severity: "high",
      title: "Cache graph-derived dashboards in memory between route switches",
      file: "backend/app/services/graph/graph_queries.py",
      line_range: [1, 120],
      code_snippet: "await _cache_set(project_id, \"stats\", {}, result)",
      explanation: "The graph endpoints already cache, but the frontend repeatedly rehydrates the same shape on navigation.",
      suggested_fix: "Persist the last good snapshot in the client query cache and keep stale data visible during refetch.",
      effort: "low",
    },
  ],
};

export const recommendationFallback = [
  {
    feature: "Realtime job inspector",
    rationale: "Surface ingest progress, reanalysis steps, and failure reasons in a persistent activity rail.",
    complexity: "low",
    files_to_create: ["frontend/components/job-activity-rail.tsx"],
    files_to_modify: ["frontend/components/shared/JobProgress.tsx", "frontend/app/dashboard/page.tsx"],
  },
  {
    feature: "Architecture diff snapshots",
    rationale: "Let teams compare health scores and issue counts before and after a change.",
    complexity: "high",
    files_to_create: ["backend/app/api/v1/snapshots.py", "frontend/app/dashboard/[projectId]/architecture/history/page.tsx"],
    files_to_modify: ["backend/app/services/intelligence/architecture_analyzer.py"],
  },
];

export const onboardingFallback = {
  topic: "How does authentication work?",
  summary: "Authentication starts in the Next.js app, passes through the token store, and is validated by the FastAPI backend before protected project data is returned.",
  entry_points: ["frontend/app/(auth)/login/page.tsx", "frontend/lib/api.ts", "backend/app/core/auth.py"],
  execution_flow: [
    { step: 1, file: "frontend/app/(auth)/login/page.tsx", function: "handleLogin", description: "Collects credentials and stores the bearer token for all subsequent API calls." },
    { step: 2, file: "frontend/lib/api.ts", function: "api.interceptors.request", description: "Adds the token to each request and redirects on 401 responses." },
    { step: 3, file: "backend/app/api/v1/projects.py", function: "list_projects", description: "Filters repositories by the authenticated user and returns project metadata." },
    { step: 4, file: "backend/app/services/intelligence/onboarding_guide.py", function: "generate_onboarding", description: "Uses hybrid retrieval to stitch together a code-aware guide for the topic." },
  ],
  key_files: [
    "frontend/app/dashboard/[projectId]/onboarding/page.tsx",
    "frontend/components/project-shell.tsx",
    "backend/app/services/rag/context_builder.py",
  ],
  gotchas: [
    "The frontend reads the token from sessionStorage, so refreshes depend on the browser session.",
    "The onboarding guide uses cached backend synthesis, so stale guidance can persist until the cache expires.",
    "Large repositories may take longer to process before the guide becomes useful.",
  ],
};

