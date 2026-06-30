# CodeSage — Azure Infrastructure (Terraform)

This directory contains all Terraform code to deploy CodeSage to Azure.

## Architecture

```
Azure Container Apps Environment
├── codesage-backend   (FastAPI, internal ingress, 1–5 replicas)
├── codesage-worker    (Celery, no ingress, 1–4 replicas)
└── codesage-frontend  (Next.js, external HTTPS, 1–3 replicas)

Managed Services
├── Azure Database for PostgreSQL Flexible Server
├── Azure Cache for Redis (TLS-only)
├── Azure Container Registry (ACR)
├── Azure Key Vault (all secrets)
└── Azure Application Insights + Log Analytics

External Managed Services (not in Azure)
├── Neo4j AuraDB          → bolt+s://... URI
└── Qdrant Cloud          → https://... URL + API key
```

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Terraform | ≥ 1.7 | `brew install terraform` |
| Azure CLI | ≥ 2.60 | `brew install azure-cli` |
| Docker | any | docker.com |

## First-time Setup

### 1. Login to Azure
```bash
az login
az account set --subscription "<your-subscription-id>"
```

### 2. Create Terraform remote state storage
```bash
# Run once — creates storage account for Terraform state
az group create --name codesage-tfstate-rg --location eastus

az storage account create \
  --name codesagetfstate \
  --resource-group codesage-tfstate-rg \
  --sku Standard_LRS \
  --allow-blob-public-access false

az storage container create \
  --name tfstate \
  --account-name codesagetfstate
```

### 3. Set up OIDC federated credentials for GitHub Actions
```bash
# Create an App Registration
APP_ID=$(az ad app create --display-name "codesage-github-actions" --query appId -o tsv)
az ad sp create --id $APP_ID

# Add federated credential for main branch
az ad app federated-credential create \
  --id $APP_ID \
  --parameters '{
    "name": "github-main",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:YOUR_GITHUB_ORG/CodeSage:ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# Grant Contributor on subscription
az role assignment create \
  --assignee $APP_ID \
  --role Contributor \
  --scope /subscriptions/<subscription-id>

echo "AZURE_CLIENT_ID=$APP_ID"
echo "AZURE_TENANT_ID=$(az account show --query tenantId -o tsv)"
echo "AZURE_SUBSCRIPTION_ID=$(az account show --query id -o tsv)"
```

Add these three values as GitHub Secrets in your repo.

### 4. Create a secrets file (NEVER commit this)
```bash
cat > infra/secrets.tfvars <<'EOF'
postgres_password     = "YOUR-STRONG-POSTGRES-PASSWORD"
neo4j_aura_uri        = "bolt+s://xxxxxxxx.databases.neo4j.io"
neo4j_aura_password   = "YOUR-AURA-PASSWORD"
qdrant_cloud_url      = "https://xxxxxxxx.aws.cloud.qdrant.io"
qdrant_cloud_api_key  = "YOUR-QDRANT-API-KEY"
secret_key            = "YOUR-64-CHAR-RANDOM-SECRET"
openrouter_api_key    = "sk-or-v1-..."
github_client_id      = "Ov23li..."
github_client_secret  = "YOUR-GITHUB-OAUTH-SECRET"
nextauth_secret       = "YOUR-32-CHAR-RANDOM-NEXTAUTH-SECRET"
EOF
```

### 5. Deploy staging
```bash
cd infra

terraform init \
  -backend-config="resource_group_name=codesage-tfstate-rg" \
  -backend-config="storage_account_name=codesagetfstate" \
  -backend-config="container_name=tfstate" \
  -backend-config="key=codesage/staging.tfstate"

terraform plan \
  -var-file="environments/staging.tfvars" \
  -var-file="secrets.tfvars" \
  -out=staging.tfplan

terraform apply staging.tfplan
```

### 6. Deploy production
```bash
terraform init \
  -backend-config="key=codesage/prod.tfstate" \
  -reconfigure

terraform plan \
  -var-file="environments/prod.tfvars" \
  -var-file="secrets.tfvars" \
  -out=prod.tfplan

terraform apply prod.tfplan
```

## GitHub Secrets Required

Set these in your repo at **Settings → Secrets and variables → Actions**:

| Secret | Description |
|--------|-------------|
| `AZURE_CLIENT_ID` | App Registration client ID (from step 3) |
| `AZURE_TENANT_ID` | Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |
| `ACR_LOGIN_SERVER` | e.g. `codesagestagingacr.azurecr.io` |
| `AZURE_RESOURCE_GROUP` | e.g. `codesage-staging-rg` |
| `STAGING_URL` | e.g. `https://staging.rohitganguly.dev` |
| `PRODUCTION_URL` | e.g. `https://rohitganguly.dev` |

> [!NOTE]
> ACR username/password are not needed as GitHub Secrets if using OIDC — `az acr login` uses the federated identity.

## Production Environment Gate

In GitHub: **Settings → Environments → production → Required reviewers**

Add yourself (or a team) as a required reviewer. This blocks the production deployment job until a human explicitly approves it in the GitHub Actions UI.

## Estimated Monthly Cost

| Service | Tier | Est. Cost |
|---------|------|-----------|
| Container Apps (backend + worker + frontend) | Consumption | ~$20–60/mo |
| PostgreSQL Flexible Server | GP D2ds_v4 | ~$70/mo |
| Redis Cache | Standard C1 | ~$55/mo |
| ACR | Standard | ~$10/mo |
| Key Vault | Standard | ~$2/mo |
| App Insights + Log Analytics | Pay-per-use | ~$5–15/mo |
| **Total (prod)** | | **~$162–212/mo** |
| **Staging** | Smaller SKUs | **~$30–50/mo** |

> Costs vary by region and usage. Container Apps on consumption plan scale to zero = $0 when idle.
