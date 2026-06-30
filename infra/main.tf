# ─────────────────────────────────────────────────────────────────────────────
# CodeSage — Terraform root module
# Azure Container Apps + managed services
# ─────────────────────────────────────────────────────────────────────────────

terraform {
  required_version = ">= 1.7.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.110"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.50"
    }
  }

  # Remote state — Azure Blob Storage backend
  # Initialise with:
  #   terraform init \
  #     -backend-config="resource_group_name=codesage-tfstate-rg" \
  #     -backend-config="storage_account_name=codesagetfstate" \
  #     -backend-config="container_name=tfstate" \
  #     -backend-config="key=codesage/${var.environment}.tfstate"
  backend "azurerm" {}
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = false
      recover_soft_deleted_key_vaults = true
    }
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# Data sources
# ─────────────────────────────────────────────────────────────────────────────

data "azurerm_client_config" "current" {}

# ─────────────────────────────────────────────────────────────────────────────
# Resource group
# ─────────────────────────────────────────────────────────────────────────────

resource "azurerm_resource_group" "main" {
  name     = "${var.project}-${var.environment}-rg"
  location = var.location

  tags = local.common_tags
}

# ─────────────────────────────────────────────────────────────────────────────
# Locals
# ─────────────────────────────────────────────────────────────────────────────

locals {
  common_tags = {
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
    repo        = "CodeSage"
  }

  resource_prefix = "${var.project}-${var.environment}"
}

# ─────────────────────────────────────────────────────────────────────────────
# Azure Container Registry
# ─────────────────────────────────────────────────────────────────────────────

resource "azurerm_container_registry" "acr" {
  name                = "${replace(local.resource_prefix, "-", "")}acr"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = var.environment == "prod" ? "Standard" : "Basic"
  admin_enabled       = true

  tags = local.common_tags
}

# ─────────────────────────────────────────────────────────────────────────────
# Monitoring (Log Analytics + Application Insights)
# ─────────────────────────────────────────────────────────────────────────────

module "monitoring" {
  source = "./modules/monitoring"

  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  resource_prefix     = local.resource_prefix
  tags                = local.common_tags
}

# ─────────────────────────────────────────────────────────────────────────────
# Key Vault
# ─────────────────────────────────────────────────────────────────────────────

module "keyvault" {
  source = "./modules/keyvault"

  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  resource_prefix     = local.resource_prefix
  tenant_id           = data.azurerm_client_config.current.tenant_id
  object_id           = data.azurerm_client_config.current.object_id
  tags                = local.common_tags

  # Secrets to store
  secrets = {
    secret-key               = var.secret_key
    openrouter-api-key       = var.openrouter_api_key
    github-client-id         = var.github_client_id
    github-client-secret     = var.github_client_secret
    github-pat               = var.github_pat
    nextauth-secret          = var.nextauth_secret
    postgres-password        = var.postgres_password
    redis-password           = var.redis_password
    appinsights-cs           = module.monitoring.app_insights_connection_string
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# PostgreSQL Flexible Server
# ─────────────────────────────────────────────────────────────────────────────

module "postgres" {
  source = "./modules/postgres"

  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  resource_prefix     = local.resource_prefix
  environment         = var.environment
  postgres_password   = var.postgres_password
  tags                = local.common_tags
}

# ─────────────────────────────────────────────────────────────────────────────
# Azure Cache for Redis
# ─────────────────────────────────────────────────────────────────────────────

module "redis" {
  source = "./modules/redis"

  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  resource_prefix     = local.resource_prefix
  environment         = var.environment
  tags                = local.common_tags
}

# ─────────────────────────────────────────────────────────────────────────────
# Container Apps (backend, worker, frontend)
# ─────────────────────────────────────────────────────────────────────────────

module "container_apps" {
  source = "./modules/container_apps"

  resource_group_name     = azurerm_resource_group.main.name
  location                = azurerm_resource_group.main.location
  resource_prefix         = local.resource_prefix
  environment             = var.environment
  tags                    = local.common_tags

  # ACR
  acr_login_server = azurerm_container_registry.acr.login_server
  acr_username     = azurerm_container_registry.acr.admin_username
  acr_password     = azurerm_container_registry.acr.admin_password
  image_tag        = var.image_tag

  # Managed services connection strings
  database_url      = module.postgres.connection_string_asyncpg
  alembic_db_url    = module.postgres.connection_string_sync
  redis_url         = module.redis.connection_string
  neo4j_uri         = var.neo4j_aura_uri
  neo4j_user        = var.neo4j_aura_user
  neo4j_password    = var.neo4j_aura_password
  qdrant_url        = var.qdrant_cloud_url
  qdrant_api_key    = var.qdrant_cloud_api_key

  # Secrets (from Key Vault outputs or direct vars)
  secret_key                         = var.secret_key
  openrouter_api_key                 = var.openrouter_api_key
  github_client_id                   = var.github_client_id
  github_client_secret               = var.github_client_secret
  nextauth_secret                    = var.nextauth_secret
  app_insights_connection_string     = module.monitoring.app_insights_connection_string

  # Domain
  domain = var.domain

  log_analytics_workspace_id = module.monitoring.workspace_id
}
