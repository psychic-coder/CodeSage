# CodeSage

# CodeSage

CodeSage is a developer-assist platform that analyzes codebases, builds dependency graphs, computes impact and risk, and provides RAG (retrieval-augmented generation) analysis and recommendations using LLMs and vector stores. It combines static analysis, graph analysis, embeddings, and LLM-driven intelligence to help engineers understand and prioritize code changes.

--

**Contents**

- Purpose
- Key features
- Architecture overview
- Tech stack and tools
- Local development (quickstart + Docker)
- Testing
- CI / GitHub Actions
- Production image and deployment notes
- Troubleshooting
- Contributing
- Files of interest

--

**Purpose**

CodeSage aims to automate and accelerate codebase understanding by:

- Building a code dependency graph from ingested sources (files, GitHub repos).
- Computing propagation and impact analysis to surface risky or high-impact changes.
- Enriching the analysis with embeddings and vector search for semantic context.
- Providing RAG-style analysis endpoints powered by LLMs for human-readable explanations and recommendations.

It is useful for code review acceleration, prioritizing technical debt, and onboarding developers to unfamiliar code.

**Key features**

- Graph construction and queries (Neo4j-backed graph builder and query helpers).
- Static parsing and language-agnostic ingestion (tree-sitter integration).
- Vector embeddings and search (Qdrant integration via `qdrant-client`).
- Background tasks and workers (Celery + Redis broker/backplane).
- RAG endpoints combining vector retrieval and LLM prompts for analysis.
- Authentication and project/job models with Postgres persistence.
- Alembic-based database migrations for Postgres schema management.

**Architecture overview**

High-level components:

- Backend API: FastAPI service in `backend/app` providing REST and WebSocket endpoints.
- Graph database: Neo4j for code/AST graph storage and queries.
- Vector store: Qdrant for embeddings and semantic retrieval.
- Persistence: Postgres for relational models (projects, jobs, users).
- Cache/broker: Redis for Celery and caching.
- Workers: Celery workers for long-running ingestion and analysis tasks.
- Frontend: Next.js app in `frontend/` providing UI and auth flows.

Sequence for a typical analysis

1. Ingest repository (local files or GitHub URL).
2. Parse files (tree-sitter), emit AST and symbol graph.
3. Build/augment graph in Neo4j.
4. Split text into chunks, produce embeddings, store vectors in Qdrant.
5. Run impact/risk calculators on graph.
6. Serve RAG results via API endpoints combining retrieval and LLM completions.

**Tech stack & tools**

- Language: Python 3.11
- Web framework: FastAPI
- Frontend: Next.js + TypeScript
- Databases: PostgreSQL, Neo4j
- Vector DB: Qdrant
- Cache/Broker: Redis
- Workers: Celery
- Embeddings/LLMs: OpenRouter (configurable) / embedding model
- Parsers: tree-sitter
- Packaging/build: setuptools (`pyproject.toml`, `setup.cfg`)
- Migrations: Alembic (backend/migrations)
- Tests: pytest, pytest-asyncio
- CI: GitHub Actions (see `.github/workflows/ci.yml`)

**Files of interest**

- Backend entrypoint: `backend/entrypoint.sh`
- Backend app: `backend/app` (API, services, database, models)
- Backend requirements: `backend/requirements.txt`
- Alembic config: `backend/alembic.ini`, `backend/migrations/`
- CI workflow: `.github/workflows/ci.yml`
- Backend Dockerfile: `backend/Dockerfile`

--

## Local development — Quickstart

Prerequisites

- macOS / Linux / Windows WSL
- Python 3.11 (pyenv recommended)
- Rust toolchain (for some packages like `tiktoken`) — `rustup` (optional for local dev if wheels are available)
- Docker & Docker Compose (optional for running services)

Recommended: use `pyenv` to install Python 3.11, create a venv, and use the repository-local venv.

1) Clone repository

```bash
git clone <repo-url>
cd CodeSage
git checkout -b feat/tests
```

2) Create `.env.local` from `.env.example` and populate secrets/APIs (OpenRouter, GitHub, DB credentials)

3) Create and activate a venv (example):

```bash
python -m venv .venv
source .venv/bin/activate
pip install --upgrade pip setuptools wheel
```

4) Install backend dependencies and editably install the package (recommended for development):

```bash
pip install -r backend/requirements.txt
pip install -e backend
```

5) Run services locally with Docker Compose (optional):

```bash
docker-compose up -d
# ensure postgres/neo4j/qdrant/redis/minio are running per .env.docker
```

6) Run Alembic migrations (backend must be installed or PYTHONPATH set):

```bash
cd backend
alembic upgrade head
```

7) Start backend (dev reload)

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

8) Start frontend

```bash
cd frontend
npm install
npm run dev
```

Now the frontend should be available at `http://localhost:3000` and the API at `http://localhost:8000`.

## Testing

Run backend unit tests locally (venv active):

```bash
# from repo root
source .venv/bin/activate
python -m pytest backend/tests -q
```

Notes:
- The test suite uses `pytest-asyncio`. Some tests stub external services (Neo4j/Redis) via `backend/tests/conftest.py` so not all services must be running.

## CI / GitHub Actions

See `.github/workflows/ci.yml`. The workflow currently:

- Spins up services (Postgres, Neo4j, Redis) for the backend job.
- Installs Python 3.11 and dependencies.
- Waits for Postgres and runs Alembic migrations (`alembic upgrade head`).
- Runs backend tests with `pytest`.
- Runs frontend build in a separate job.

CI specifics:
- The workflow now installs the backend package (`pip install -e backend`) so tests import the `app` package deterministically.

## Docker / Production image

`backend/Dockerfile` is prepared to install the package into the image via `pip install .`.

Build the production image:

```bash
cd backend
docker build -t codesage-backend:latest .
```

Run the production image (ensure service connections via env vars):

```bash
docker run -p 8000:8000 --env-file .env.docker codesage-backend:latest
```

Production image notes:
- If native/Rust extensions (e.g., `tiktoken`, `psycopg2`) fail to build, add appropriate build tools to the Dockerfile (e.g., `build-essential`, `libpq-dev`, `gcc`, and Rust tooling) or prebuild wheels in your CI pipeline and install wheels instead.

## Alembic migrations

- Migration configuration lives in `backend/alembic.ini` and `backend/migrations/`.
- Run locally:

```bash
cd backend
alembic upgrade head
```

In CI we run the same command against the test Postgres service before running tests.

## Troubleshooting

- "ModuleNotFoundError: No module named 'backend' / 'app'" — Ensure either:
	- You run tests with `PYTHONPATH=backend python -m pytest`, or
	- Install the package (`pip install -e backend`) in your venv (recommended).
- Native build failures (psycopg2, tiktoken): use Python 3.11, install Rust via `rustup`, and ensure system build deps (`libpq-dev`, `build-essential`) are present when building from source.
- If CI fails on service readiness, increase retries/timeouts in `.github/workflows/ci.yml`.

## Contributing

- Follow repository coding style and open PRs against the `main` branch.
- Run tests locally before opening PRs.
- Keep migrations in `backend/migrations/versions/` and run `alembic revision --autogenerate -m "msg"` when changing models.

## License

This repository does not include an explicit license file. Add a `LICENSE` if you intend to open-source the project.

---

If you'd like, I can also:

- Add a short architecture diagram or Mermaid flow in this README.
- Add a `CONTRIBUTING.md` with Git/branching conventions.
- Add Dockerfile build-deps for native extensions and re-run a local build.

