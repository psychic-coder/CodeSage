# ─────────────────────────────────────────────────────────────────────────────
# CodeSage — Terraform outputs
# ─────────────────────────────────────────────────────────────────────────────

output "resource_group_name" {
  description = "Azure Resource Group name"
  value       = azurerm_resource_group.main.name
}

output "acr_login_server" {
  description = "ACR login server URL (e.g. codesageacr.azurecr.io)"
  value       = azurerm_container_registry.acr.login_server
}

output "acr_admin_username" {
  description = "ACR admin username"
  value       = azurerm_container_registry.acr.admin_username
  sensitive   = true
}

output "acr_admin_password" {
  description = "ACR admin password"
  value       = azurerm_container_registry.acr.admin_password
  sensitive   = true
}

output "postgres_fqdn" {
  description = "PostgreSQL server FQDN"
  value       = module.postgres.server_fqdn
}

output "postgres_connection_string" {
  description = "PostgreSQL asyncpg connection string"
  value       = module.postgres.connection_string_asyncpg
  sensitive   = true
}

output "redis_hostname" {
  description = "Azure Cache for Redis hostname"
  value       = module.redis.hostname
}

output "redis_connection_string" {
  description = "Redis TLS connection string"
  value       = module.redis.connection_string
  sensitive   = true
}

output "key_vault_uri" {
  description = "Azure Key Vault URI"
  value       = module.keyvault.vault_uri
}

output "app_insights_connection_string" {
  description = "Application Insights connection string"
  value       = module.monitoring.app_insights_connection_string
  sensitive   = true
}

output "app_insights_instrumentation_key" {
  description = "Application Insights instrumentation key (legacy)"
  value       = module.monitoring.instrumentation_key
  sensitive   = true
}

output "backend_url" {
  description = "Backend Container App FQDN"
  value       = module.container_apps.backend_fqdn
}

output "frontend_url" {
  description = "Frontend Container App FQDN"
  value       = module.container_apps.frontend_fqdn
}
