resource "azurerm_redis_cache" "main" {
  name                = "${var.resource_prefix}-redis"
  resource_group_name = var.resource_group_name
  location            = var.location

  # Staging: C0 Basic (cheap, no SLA)
  # Prod: C1 Standard (replication, SLA)
  sku_name   = var.environment == "prod" ? "Standard" : "Basic"
  family     = "C"
  capacity   = var.environment == "prod" ? 1 : 0

  # Security
  enable_non_ssl_port = false
  minimum_tls_version = "1.2"

  redis_configuration {
    maxmemory_policy = "allkeys-lru"
  }

  tags = var.tags
}

output "hostname" {
  value = azurerm_redis_cache.main.hostname
}

output "ssl_port" {
  value = azurerm_redis_cache.main.ssl_port
}

output "primary_access_key" {
  value     = azurerm_redis_cache.main.primary_access_key
  sensitive = true
}

output "connection_string" {
  # Azure Cache for Redis TLS connection string for Redis library
  value     = "rediss://:${azurerm_redis_cache.main.primary_access_key}@${azurerm_redis_cache.main.hostname}:${azurerm_redis_cache.main.ssl_port}/0"
  sensitive = true
}

variable "resource_group_name" { type = string }
variable "location"            { type = string }
variable "resource_prefix"     { type = string }
variable "environment"         { type = string }
variable "tags"                { type = map(string) }
