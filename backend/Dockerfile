# ── Stage 1: Build dependencies (includes build tools + Rust for tiktoken) ────
FROM python:3.11.9-slim-bookworm AS builder

# Install build tools needed for native extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    gcc \
    curl \
    ca-certificates \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Rust (required for tiktoken)
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable --no-modify-path
ENV PATH="/root/.cargo/bin:${PATH}"

WORKDIR /build

# Copy packaging manifests first to leverage layer cache
COPY pyproject.toml setup.cfg requirements.txt ./

# Install all Python dependencies into an isolated prefix
RUN pip install --upgrade pip && \
    pip install --no-cache-dir --prefix=/install -r requirements.txt

# Copy source and install the package itself
COPY . .
RUN pip install --no-cache-dir --prefix=/install --no-deps .


# ── Stage 2: Minimal production runtime ───────────────────────────────────────
FROM python:3.11.9-slim-bookworm AS runtime

# Only runtime system libraries (no build tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --system --gid 1001 appgroup && \
    useradd --system --uid 1001 --gid appgroup --shell /bin/false appuser

# Copy installed packages from builder stage
COPY --from=builder /install /usr/local

WORKDIR /app

# Copy only the application source (no build artefacts)
COPY --chown=appuser:appgroup . .

RUN chmod +x entrypoint.sh

USER appuser

EXPOSE 8000

# Docker-native health check (also works with docker-compose health checks)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:8000/health/live || exit 1

ENTRYPOINT ["./entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", \
     "--workers", "2", "--proxy-headers", "--forwarded-allow-ips", "*"]