locals {
  server_name = "${var.resource_prefix}-pg"
  db_name     = "codesage"
  admin_user  = "codesageadmin"
}

resource "azurerm_postgresql_flexible_server" "main" {
  name                   = local.server_name
  resource_group_name    = var.resource_group_name
  location               = var.location
  version                = "16"
  administrator_login    = local.admin_user
  administrator_password = var.postgres_password

  # SKU: staging uses Burstable (cheap), prod uses General Purpose
  sku_name = var.environment == "prod" ? "GP_Standard_D2ds_v4" : "B_Standard_B1ms"

  storage_mb = var.environment == "prod" ? 65536 : 32768

  backup_retention_days        = var.environment == "prod" ? 7 : 1
  geo_redundant_backup_enabled = var.environment == "prod" ? true : false

  tags = var.tags
}

resource "azurerm_postgresql_flexible_server_database" "codesage" {
  name      = local.db_name
  server_id = azurerm_postgresql_flexible_server.main.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

# Allow Azure services to connect (Container Apps are in Azure fabric)
resource "azurerm_postgresql_flexible_server_firewall_rule" "azure_services" {
  name             = "AllowAzureServices"
  server_id        = azurerm_postgresql_flexible_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

output "server_fqdn" {
  value = azurerm_postgresql_flexible_server.main.fqdn
}

output "connection_string_asyncpg" {
  value     = "postgresql+asyncpg://${local.admin_user}:${var.postgres_password}@${azurerm_postgresql_flexible_server.main.fqdn}:5432/${local.db_name}?sslmode=require"
  sensitive = true
}

output "connection_string_sync" {
  value     = "postgresql://${local.admin_user}:${var.postgres_password}@${azurerm_postgresql_flexible_server.main.fqdn}:5432/${local.db_name}?sslmode=require"
  sensitive = true
}

variable "resource_group_name" { type = string }
variable "location"            { type = string }
variable "resource_prefix"     { type = string }
variable "environment"         { type = string }
variable "postgres_password"   { type = string; sensitive = true }
variable "tags"                { type = map(string) }
