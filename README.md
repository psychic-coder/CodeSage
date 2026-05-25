# CodeSage

## Environment setup

CodeSage uses two env files for day-to-day development:

- `.env.local` for running the app locally without Docker
- `.env.docker` for Docker Compose

Start from `.env.example` and copy the values into the env file you need.

### Local development

Use `.env.local` with localhost service URLs:

- PostgreSQL: `localhost:5432`
- Neo4j: `localhost:7687`
- Qdrant: `localhost:6333`
- Redis: `localhost:6379`
- MinIO: `localhost:9000`
- Frontend/API URLs: `http://localhost:3000` and `http://localhost:8000`

### Docker Compose

Use `.env.docker` with container service names:

- PostgreSQL: `postgres:5432`
- Neo4j: `neo4j:7687`
- Qdrant: `qdrant:6333`
- Redis: `redis:6379`
- MinIO: `minio:9000`

### OpenRouter

The app uses OpenRouter for LLM calls.

Set:

- `OPENROUTER_API_KEY`
- `OPENROUTER_BASE_URL=https://openrouter.ai`
- `LLM_MODEL` to the model you want to use
- `EMBEDDING_MODEL` to your embedding model

### GitHub credentials

Set these only if you need GitHub-backed features:

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_PERSONAL_TOKEN`

### Notes

- `.env.local` and `.env.docker` are ignored by git.
- `.env.example` documents the expected values and can be used as a starting point.
