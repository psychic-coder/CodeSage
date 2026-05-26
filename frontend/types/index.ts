export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  source_type: "github" | "zip" | "local";
  source_url: string | null;
  primary_language: string | null;
  total_files: number;
  total_nodes: number;
  total_edges: number;
  status: "pending" | "processing" | "ready" | "failed";
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobStatus {
  id: string;
  project_id: string;
  job_type: string;
  status: "queued" | "running" | "done" | "failed";
  progress: number;
  current_step: string | null;
  error_message: string | null;
}

export interface GraphNode {
  id: string;
  path: string;
  name: string;
  language: string;
  lines_of_code: number;
  complexity_score: number;
  risk_score: number;
  size_bytes: number;
  in_degree?: number;
  out_degree?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface ImpactFile {
  path: string;
  reason: string;
  change_type: "modify" | "create" | "delete";
  priority: "critical" | "high" | "medium" | "low";
  suggested_changes?: string;
}

export interface ImpactResult {
  files_to_modify: ImpactFile[];
  files_to_create: ImpactFile[];
  downstream_risks: { file: string; risk: string; risk_level: string }[];
  dependencies_to_add: string[];
  estimated_complexity: "low" | "medium" | "high" | "very_high";
  implementation_order: string[];
}

export interface ArchitectureIssue {
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  involved_files: string[];
  suggested_fix: string;
}

export interface ArchitectureResult {
  overall_health_score: number;
  health_label: string;
  issues: ArchitectureIssue[];
  strengths: string[];
  architecture_pattern: string;
  scalability_assessment: string;
}

export interface Improvement {
  id: string;
  category: "performance" | "security" | "refactoring";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  file: string;
  line_range?: [number, number];
  code_snippet?: string;
  explanation: string;
  suggested_fix: string;
  effort: "low" | "medium" | "high";
}

export interface Recommendation {
  feature: string;
  rationale: string;
  complexity: "low" | "medium" | "high";
  files_to_create: string[];
  files_to_modify: string[];
  dependencies_needed: string[];
}

export interface OnboardingResult {
  topic: string;
  summary: string;
  entry_points: string[];
  execution_flow: {
    step: number;
    file: string;
    function: string;
    description: string;
  }[];
  key_files: string[];
  suggested_reading_order: string[];
  data_models_involved: string[];
  external_dependencies: string[];
  gotchas: string[];
}
