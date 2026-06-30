# ─────────────────────────────────────────────────────────────────────────────
# CodeSage — Terraform input variables
# ─────────────────────────────────────────────────────────────────────────────

# ── Core ──────────────────────────────────────────────────────────────────────

variable "project" {
  description = "Short project name (used in resource naming)"
  type        = string
  default     = "codesage"
}

variable "environment" {
  description = "Deployment environment: staging | prod"
  type        = string
  validation {
    condition     = contains(["staging", "prod"], var.environment)
    error_message = "environment must be 'staging' or 'prod'."
  }
}

variable "location" {
  description = "Azure region for all resources"
  type        = string
  default     = "eastus"
}

variable "domain" {
  description = "Root domain name (e.g. rohitganguly.dev)"
  type        = string
  default     = "rohitganguly.dev"
}

variable "image_tag" {
  description = "Docker image tag (git SHA) to deploy"
  type        = string
  default     = "latest"
}

# ── PostgreSQL ────────────────────────────────────────────────────────────────

variable "postgres_password" {
  description = "PostgreSQL administrator password"
  type        = string
  sensitive   = true
}

# ── Redis ─────────────────────────────────────────────────────────────────────

variable "redis_password" {
  description = "Redis AUTH password (for local Redis fallback)"
  type        = string
  sensitive   = true
  default     = ""
}

# ── Neo4j AuraDB ─────────────────────────────────────────────────────────────

variable "neo4j_aura_uri" {
  description = "Neo4j AuraDB bolt+s:// connection URI"
  type        = string
  sensitive   = true
}

variable "neo4j_aura_user" {
  description = "Neo4j AuraDB username"
  type        = string
  default     = "neo4j"
}

variable "neo4j_aura_password" {
  description = "Neo4j AuraDB password"
  type        = string
  sensitive   = true
}

# ── Qdrant Cloud ──────────────────────────────────────────────────────────────

variable "qdrant_cloud_url" {
  description = "Qdrant Cloud cluster HTTPS URL"
  type        = string
  sensitive   = true
}

variable "qdrant_cloud_api_key" {
  description = "Qdrant Cloud API key"
  type        = string
  sensitive   = true
}

# ── App secrets ───────────────────────────────────────────────────────────────

variable "secret_key" {
  description = "FastAPI JWT secret key (min 32 chars, random)"
  type        = string
  sensitive   = true
}

variable "openrouter_api_key" {
  description = "OpenRouter API key for LLM requests"
  type        = string
  sensitive   = true
}

variable "github_client_id" {
  description = "GitHub OAuth App client ID"
  type        = string
  sensitive   = true
}

variable "github_client_secret" {
  description = "GitHub OAuth App client secret"
  type        = string
  sensitive   = true
}

variable "github_pat" {
  description = "GitHub Personal Access Token for repo ingestion"
  type        = string
  sensitive   = true
  default     = ""
}

variable "nextauth_secret" {
  description = "NextAuth.js secret (min 32 chars, random)"
  type        = string
  sensitive   = true
}
