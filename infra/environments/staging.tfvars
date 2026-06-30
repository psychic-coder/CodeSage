# ─────────────────────────────────────────────────────────────────────────────
# Staging environment — non-sensitive values only
# Sensitive values (passwords, API keys) must be passed via:
#   TF_VAR_<name>=<value>  or  -var-file=secrets.tfvars (never committed)
# ─────────────────────────────────────────────────────────────────────────────

environment = "staging"
location    = "eastus"
project     = "codesage"
domain      = "staging.rohitganguly.dev"
image_tag   = "latest"
