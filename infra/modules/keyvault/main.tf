resource "azurerm_key_vault" "main" {
  name                = "${var.resource_prefix}-kv"
  resource_group_name = var.resource_group_name
  location            = var.location
  tenant_id           = var.tenant_id
  sku_name            = "standard"

  # Security
  soft_delete_retention_days = 7
  purge_protection_enabled   = true

  # RBAC model (recommended over access policies)
  enable_rbac_authorization = true

  network_acls {
    default_action = "Allow"
    bypass         = "AzureServices"
  }

  tags = var.tags
}

# Grant the deploying identity Secrets Officer role (read + write secrets)
resource "azurerm_role_assignment" "kv_secrets_officer" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = var.object_id
}

# Store all app secrets
resource "azurerm_key_vault_secret" "secrets" {
  for_each = var.secrets

  name         = each.key
  value        = each.value
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [azurerm_role_assignment.kv_secrets_officer]
}

output "vault_uri" {
  value = azurerm_key_vault.main.vault_uri
}

output "vault_id" {
  value = azurerm_key_vault.main.id
}

variable "resource_group_name" { type = string }
variable "location"            { type = string }
variable "resource_prefix"     { type = string }
variable "tenant_id"           { type = string }
variable "object_id"           { type = string }
variable "tags"                { type = map(string) }
variable "secrets" {
  type      = map(string)
  sensitive = true
  default   = {}
}
