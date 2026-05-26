#!/usr/bin/env bash
set -euo pipefail
OUT=${1:-./backend/app/vendor/tree_sitter.so}
mkdir -p "$(dirname "$OUT")"
echo "Building tree-sitter languages into $OUT"

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || true)
if [ -n "$REPO_ROOT" ]; then
    REPO_SCRIPTS="$REPO_ROOT/scripts"
else
    REPO_SCRIPTS="$(pwd)/scripts"
fi

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT
pushd "$TMPDIR" >/dev/null
git clone --depth 1 https://github.com/tree-sitter/tree-sitter-javascript.git
git clone --depth 1 https://github.com/tree-sitter/tree-sitter-python.git

# Prefer explicit PYTHON env var, otherwise try common python3 locations
PYTHON=${PYTHON:-"$(command -v python3 || command -v python || true)"}
if [ -n "$PYTHON" ] && "$PYTHON" - <<'PY' 2>/dev/null
try:
    from tree_sitter import Language
    if hasattr(Language, 'build_library'):
        print('PYTHON_BUILD_OK')
    else:
        raise AttributeError('no build_library')
except Exception:
    raise SystemExit(2)
PY
then
    echo "Using Python tree_sitter build with $PYTHON"
    "$PYTHON" - <<PY
from tree_sitter import Language
Language.build_library(
    '${OUT}',
    [
        '${TMPDIR}/tree-sitter-javascript',
        '${TMPDIR}/tree-sitter-python'
    ]
)
print('Built:', '${OUT}')
PY
    echo "Done. Set TREE_SITTER_LIB=$OUT to enable in production."
    popd >/dev/null
    exit 0
fi

echo "Python tree_sitter binding does not expose build API in this environment."
echo "Attempting Docker-based build as a fallback..."

if command -v docker >/dev/null 2>&1; then
    echo "Building using Docker. This may require ~200MB download on first run."
    DOCKERFILE_DIR="$REPO_SCRIPTS"
    docker build -f "$DOCKERFILE_DIR/Dockerfile.tree_sitter_builder" -t code-sage-tree-sitter-builder "$DOCKERFILE_DIR"
    # Ensure output dir exists on host (use repository root, not tmpdir)
    HOST_OUT_DIR="$REPO_ROOT/backend/app/vendor"
    mkdir -p "$HOST_OUT_DIR"
    docker run --rm -v "$HOST_OUT_DIR:/out" code-sage-tree-sitter-builder || {
        echo "Docker build/run failed. See Docker output for details."; exit 4;
    }
    if [ -f "$HOST_OUT_DIR/tree_sitter.so" ]; then
        echo "Built: $HOST_OUT_DIR/tree_sitter.so"
        echo "Done. Set TREE_SITTER_LIB=$OUT to enable in production."
        popd >/dev/null
        exit 0
    else
        echo "Docker run completed but output file not found in $HOST_OUT_DIR."
        popd >/dev/null
        exit 5
    fi
else
    echo "Docker not available. Options to complete build:" 
    echo "  1) Install a tree_sitter Python package that includes build_library into your venv and re-run this script (pip install tree_sitter)."
    echo "  2) Install tree-sitter CLI (npm i -g tree-sitter-cli) and build the languages using the CLI + a C compiler."
    echo "  3) Build the combined shared library on a Linux machine/CI with compilers and copy backend/app/vendor/tree_sitter.so into the repo, then set TREE_SITTER_LIB accordingly."
    echo "See README or contact the maintainer for assistance."
    popd >/dev/null
    exit 3
fi

