import fnmatch
import os

from app.config import settings

SKIP_DIRECTORIES = {
    "node_modules",
    ".git",
    "__pycache__",
    ".pytest_cache",
    "venv",
    ".venv",
    "env",
    "dist",
    "build",
    ".next",
    "coverage",
    ".nyc_output",
    "target",
    "vendor",
    ".idea",
    ".vscode",
}
SKIP_PATTERNS = [
    "*.min.js",
    "*.min.css",
    "*.map",
    "*.lock",
    "package-lock.json",
    "yarn.lock",
    "poetry.lock",
    "Pipfile.lock",
    "*.pyc",
    "*.pyo",
    "*.class",
    "*.jar",
    "*.exe",
    "*.dll",
    "*.so",
    "*.jpg",
    "*.jpeg",
    "*.png",
    "*.gif",
    "*.svg",
    "*.mp4",
    "*.mp3",
    "*.pdf",
    "*.zip",
    "*.tar",
    "*.log",
    "*.cache",
]
ALWAYS_INCLUDE = {
    "package.json",
    "requirements.txt",
    "pyproject.toml",
    "Cargo.toml",
    "go.mod",
    "pom.xml",
    "Makefile",
    "Dockerfile",
    "docker-compose.yml",
    "README.md",
}


def filter_files(root: str) -> list[str]:
    max_size = settings.max_file_size_kb * 1024
    accepted = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [
            d for d in dirnames if d not in SKIP_DIRECTORIES and not d.startswith(".")
        ]
        for fname in filenames:
            fpath = os.path.join(dirpath, fname)
            if fname in ALWAYS_INCLUDE:
                accepted.append(fpath)
                continue
            if any(fnmatch.fnmatch(fname, p) for p in SKIP_PATTERNS):
                continue
            if os.path.islink(fpath):
                continue
            try:
                sz = os.path.getsize(fpath)
            except OSError:
                continue
            if sz == 0 or sz > max_size:
                continue
            accepted.append(fpath)
            if len(accepted) >= settings.max_files_per_repo:
                return accepted
    return accepted
