# ─────────────────────────────────────────────────────────────────────────────
# Container Apps — Environment + App definitions
# ─────────────────────────────────────────────────────────────────────────────

resource "azurerm_container_app_environment" "main" {
  name                       = "${var.resource_prefix}-cae"
  resource_group_name        = var.resource_group_name
  location                   = var.location
  log_analytics_workspace_id = var.log_analytics_workspace_id

  tags = var.tags
}

# ── Shared environment variables for backend + worker ─────────────────────────
locals {
  backend_env_vars = [
    { name = "APP_ENV",                              value = var.environment == "prod" ? "production" : "development" },
    { name = "ALLOWED_ORIGINS",                      value = "https://${var.domain}" },
    { name = "DATABASE_URL",                         value = var.database_url },
    { name = "ALEMBIC_DATABASE_URL",                 value = var.alembic_db_url },
    { name = "NEO4J_URI",                            value = var.neo4j_uri },
    { name = "NEO4J_USER",                           value = var.neo4j_user },
    { name = "QDRANT_URL",                           value = var.qdrant_url },
    { name = "REDIS_URL",                            value = var.redis_url },
    { name = "LLM_MODEL",                            value = "gpt-4o" },
    { name = "EMBEDDING_MODEL",                      value = "text-embedding-3-small" },
    { name = "OPENROUTER_BASE_URL",                  value = "https://openrouter.ai" },
    { name = "MAX_REPO_SIZE_MB",                     value = "500" },
    { name = "MAX_FILES_PER_REPO",                   value = "5000" },
    { name = "MAX_FILE_SIZE_KB",                     value = "500" },
    { name = "EMBEDDING_BATCH_SIZE",                 value = "100" },
  ]
  backend_secret_env_vars = [
    { name = "SECRET_KEY",                            secretRef = "secret-key" },
    { name = "OPENROUTER_API_KEY",                    secretRef = "openrouter-api-key" },
    { name = "GITHUB_CLIENT_ID",                      secretRef = "github-client-id" },
    { name = "GITHUB_CLIENT_SECRET",                  secretRef = "github-client-secret" },
    { name = "NEO4J_PASSWORD",                        secretRef = "neo4j-password" },
    { name = "QDRANT_API_KEY",                        secretRef = "qdrant-api-key" },
    { name = "APPLICATIONINSIGHTS_CONNECTION_STRING", secretRef = "appinsights-cs" },
  ]
}

# ── Backend API Container App ─────────────────────────────────────────────────
resource "azurerm_container_app" "backend" {
  name                         = "${var.resource_prefix}-backend"
  resource_group_name          = var.resource_group_name
  container_app_environment_id = azurerm_container_app_environment.main.id
  revision_mode                = "Single"

  tags = var.tags

  registry {
    server               = var.acr_login_server
    username             = var.acr_username
    password_secret_name = "acr-password"
  }

  secret {
    name  = "acr-password"
    value = var.acr_password
  }
  secret { name = "secret-key";        value = var.secret_key }
  secret { name = "openrouter-api-key"; value = var.openrouter_api_key }
  secret { name = "github-client-id";  value = var.github_client_id }
  secret { name = "github-client-secret"; value = var.github_client_secret }
  secret { name = "neo4j-password";    value = var.neo4j_password }
  secret { name = "qdrant-api-key";    value = var.qdrant_api_key }
  secret { name = "appinsights-cs";    value = var.app_insights_connection_string }

  ingress {
    external_enabled = false   # internal only; nginx is the public face
    target_port      = 8000
    transport        = "http"
  }

  template {
    min_replicas = var.environment == "prod" ? 1 : 0
    max_replicas = var.environment == "prod" ? 5 : 2

    container {
      name   = "backend"
      image  = "${var.acr_login_server}/codesage-backend:${var.image_tag}"
      cpu    = var.environment == "prod" ? 1.0 : 0.5
      memory = var.environment == "prod" ? "2Gi" : "1Gi"

      dynamic "env" {
        for_each = local.backend_env_vars
        content {
          name  = env.value.name
          value = env.value.value
        }
      }
      dynamic "env" {
        for_each = local.backend_secret_env_vars
        content {
          name        = env.value.name
          secret_name = env.value.secretRef
        }
      }

      liveness_probe {
        path             = "/health/live"
        port             = 8000
        transport        = "HTTP"
        initial_delay    = 20
        interval_seconds = 30
        failure_count_threshold = 3
      }

      readiness_probe {
        path             = "/health/ready"
        port             = 8000
        transport        = "HTTP"
        initial_delay    = 10
        interval_seconds = 15
        failure_count_threshold = 3
      }
    }
  }
}

# ── Celery Worker Container App ───────────────────────────────────────────────
resource "azurerm_container_app" "worker" {
  name                         = "${var.resource_prefix}-worker"
  resource_group_name          = var.resource_group_name
  container_app_environment_id = azurerm_container_app_environment.main.id
  revision_mode                = "Single"

  tags = var.tags

  registry {
    server               = var.acr_login_server
    username             = var.acr_username
    password_secret_name = "acr-password"
  }

  secret {
    name  = "acr-password"
    value = var.acr_password
  }
  secret { name = "secret-key";           value = var.secret_key }
  secret { name = "openrouter-api-key";   value = var.openrouter_api_key }
  secret { name = "github-client-id";     value = var.github_client_id }
  secret { name = "github-client-secret"; value = var.github_client_secret }
  secret { name = "neo4j-password";       value = var.neo4j_password }
  secret { name = "qdrant-api-key";       value = var.qdrant_api_key }
  secret { name = "appinsights-cs";       value = var.app_insights_connection_string }

  ingress {
    external_enabled = false
    target_port      = 8000
    transport        = "http"
  }

  template {
    min_replicas = var.environment == "prod" ? 1 : 0
    max_replicas = var.environment == "prod" ? 4 : 2

    container {
      name    = "worker"
      image   = "${var.acr_login_server}/codesage-backend:${var.image_tag}"
      cpu     = var.environment == "prod" ? 2.0 : 0.5
      memory  = var.environment == "prod" ? "4Gi" : "1Gi"
      command = ["celery", "-A", "app.workers.celery_app", "worker", "--loglevel=info", "--concurrency=4"]

      dynamic "env" {
        for_each = local.backend_env_vars
        content {
          name  = env.value.name
          value = env.value.value
        }
      }
      dynamic "env" {
        for_each = local.backend_secret_env_vars
        content {
          name        = env.value.name
          secret_name = env.value.secretRef
        }
      }
    }
  }
}

# ── Frontend Container App ─────────────────────────────────────────────────────
resource "azurerm_container_app" "frontend" {
  name                         = "${var.resource_prefix}-frontend"
  resource_group_name          = var.resource_group_name
  container_app_environment_id = azurerm_container_app_environment.main.id
  revision_mode                = "Single"

  tags = var.tags

  registry {
    server               = var.acr_login_server
    username             = var.acr_username
    password_secret_name = "acr-password"
  }

  secret {
    name  = "acr-password"
    value = var.acr_password
  }
  secret { name = "nextauth-secret"; value = var.nextauth_secret }

  ingress {
    external_enabled = true
    target_port      = 3000
    transport        = "http"

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    min_replicas = var.environment == "prod" ? 1 : 0
    max_replicas = var.environment == "prod" ? 3 : 1

    container {
      name   = "frontend"
      image  = "${var.acr_login_server}/codesage-frontend:${var.image_tag}"
      cpu    = 0.5
      memory = "1Gi"

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "NEXT_TELEMETRY_DISABLED"
        value = "1"
      }
      env {
        name  = "NEXT_PUBLIC_API_URL"
        value = "https://api.${var.domain}"
      }
      env {
        name  = "NEXT_PUBLIC_WS_URL"
        value = "wss://api.${var.domain}"
      }
      env {
        name  = "NEXTAUTH_URL"
        value = "https://${var.domain}"
      }
      env {
        name        = "NEXTAUTH_SECRET"
        secret_name = "nextauth-secret"
      }

      liveness_probe {
        path             = "/"
        port             = 3000
        transport        = "HTTP"
        initial_delay    = 15
        interval_seconds = 30
      }
    }
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# Outputs
# ─────────────────────────────────────────────────────────────────────────────

output "backend_fqdn" {
  value = azurerm_container_app.backend.ingress[0].fqdn
}

output "frontend_fqdn" {
  value = azurerm_container_app.frontend.ingress[0].fqdn
}

# ─────────────────────────────────────────────────────────────────────────────
# Variables
# ─────────────────────────────────────────────────────────────────────────────

variable "resource_group_name"           { type = string }
variable "location"                      { type = string }
variable "resource_prefix"               { type = string }
variable "environment"                   { type = string }
variable "tags"                          { type = map(string) }
variable "log_analytics_workspace_id"    { type = string }
variable "domain"                        { type = string }
variable "acr_login_server"              { type = string }
variable "acr_username"                  { type = string; sensitive = true }
variable "acr_password"                  { type = string; sensitive = true }
variable "image_tag"                     { type = string }
variable "database_url"                  { type = string; sensitive = true }
variable "alembic_db_url"               { type = string; sensitive = true }
variable "redis_url"                     { type = string; sensitive = true }
variable "neo4j_uri"                     { type = string; sensitive = true }
variable "neo4j_user"                    { type = string }
variable "neo4j_password"               { type = string; sensitive = true }
variable "qdrant_url"                    { type = string; sensitive = true }
variable "qdrant_api_key"               { type = string; sensitive = true }
variable "secret_key"                    { type = string; sensitive = true }
variable "openrouter_api_key"           { type = string; sensitive = true }
variable "github_client_id"             { type = string; sensitive = true }
variable "github_client_secret"         { type = string; sensitive = true }
variable "nextauth_secret"              { type = string; sensitive = true }
variable "app_insights_connection_string" { type = string; sensitive = true }
