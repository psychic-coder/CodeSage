import json
import os
from pathlib import Path

EXTS = [".js", ".ts", ".jsx", ".tsx", ".py", ".mjs", ".html", ".htm"]


def _load_tsconfig_aliases(repo_root: str) -> dict:
    """Load compilerOptions.paths from tsconfig.json or jsconfig.json and
    return a simple alias mapping: alias_prefix -> filesystem path prefix.
    e.g. {"@/": "src/"}
    """
    for name in ("tsconfig.json", "jsconfig.json"):
        p = Path(repo_root) / name
        if p.exists():
            try:
                data = json.loads(p.read_text())
                opts = data.get("compilerOptions", {})
                base = opts.get("baseUrl", "")
                paths = opts.get("paths", {})
                aliases = {}
                for alias, targets in paths.items():
                    # alias like "@/*" -> targets like ["src/*"]
                    if alias.endswith("/*"):
                        key = alias[:-1]
                        tgt = targets[0] if targets else ""
                        if tgt.endswith("/*"):
                            tgt = tgt[:-1]
                        # resolve baseUrl if present
                        if base:
                            tgt = os.path.normpath(os.path.join(base, tgt))
                        aliases[key] = tgt
                return aliases
            except Exception:
                return {}
    return {}


def resolve_all_imports(parsed_files: list[dict], repo_root: str) -> list[dict]:
    path_index = {pf["path"] for pf in parsed_files}
    aliases = _load_tsconfig_aliases(repo_root)
    package_roots = _discover_package_roots(repo_root)
    barrel_index = _build_barrel_index(parsed_files)

    for pf in parsed_files:
        resolved = []
        file_dir = os.path.dirname(pf["path"])
        for imp in pf["imports"]:
            target = None
            is_external = True
            module_name = None
            # Relative imports
            if imp.startswith("."):
                target = _resolve_relative(imp, file_dir, path_index)
                is_external = target is None
            else:
                # Try alias resolution (e.g. @/components/Button -> src/components/Button)
                for alias_prefix, mapped in aliases.items():
                    if imp.startswith(alias_prefix):
                        rel = imp.replace(alias_prefix, mapped)
                        # Normalize and strip leading slashes
                        rel = rel.lstrip("/")
                        target = _resolve_candidate(rel, path_index, barrel_index)
                        is_external = target is None
                        break
                # If not alias, try bare resolution (module path relative to repo root)
                if target is None:
                    target = _resolve_candidate(imp, path_index, barrel_index)
                    if target is None:
                        # Monorepo package roots: allow resolving imports against package-local src roots.
                        for root in package_roots:
                            candidate = os.path.normpath(os.path.join(root, imp))
                            target = _resolve_candidate(
                                candidate, path_index, barrel_index
                            )
                            if target is not None:
                                break
                    # if still None, treat as external npm/pip module
                    is_external = target is None
                    if is_external:
                        module_name = _module_name_from_import(imp)

            resolved.append(
                {
                    "raw": imp,
                    "resolved": target,
                    "is_external": is_external,
                    "module_name": module_name,
                }
            )

        pf["resolved_imports"] = resolved
    return parsed_files


def _resolve_candidate(
    candidate: str, path_index: set, barrel_index: dict[str, str] | None = None
) -> str | None:
    """Attempt to resolve a non-relative candidate against the path index.

    Candidate is a repository-relative path (no leading ./ or ../). We try:
    - exact match
    - with known extensions
    - as a directory/index.ext
    """
    candidate = os.path.normpath(candidate)
    # direct match
    if candidate in path_index:
        return candidate
    if barrel_index and candidate in barrel_index:
        return barrel_index[candidate]
    # try extensions
    for ext in EXTS:
        if candidate + ext in path_index:
            return candidate + ext
        if barrel_index and candidate + ext in barrel_index:
            return barrel_index[candidate + ext]
    # try index files under candidate/
    for ext in EXTS:
        idx = os.path.join(candidate, "index" + ext)
        if idx in path_index:
            return idx
        if barrel_index and idx in barrel_index:
            return barrel_index[idx]
    return None


def _resolve_relative(imp: str, file_dir: str, path_index: set) -> str | None:
    # Build a normalized repository-relative path
    base = os.path.normpath(os.path.join(file_dir, imp))
    # If imp pointed to a file with extension (./foo.js)
    if base in path_index:
        return base
    # Try with extensions
    for ext in EXTS:
        if base + ext in path_index:
            return base + ext
    # Directory index files
    for ext in EXTS:
        candidate = os.path.join(base, "index" + ext)
        if candidate in path_index:
            return candidate
    return None


def _discover_package_roots(repo_root: str) -> list[str]:
    roots = {"."}

    # Check for workspaces at root
    try:
        pj_path = os.path.join(repo_root, "package.json")
        if os.path.exists(pj_path):
            with open(pj_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if "workspaces" in data:
                    # just a heuristic to flag it's a monorepo
                    pass
    except Exception:
        pass

    try:
        pnpm_path = os.path.join(repo_root, "pnpm-workspace.yaml")
        if os.path.exists(pnpm_path):
            pass
    except Exception:
        pass

    for current, dirs, files in os.walk(repo_root):
        rel = os.path.relpath(current, repo_root)
        if (
            "package.json" in files
            or "pyproject.toml" in files
            or "go.mod" in files
            or "Cargo.toml" in files
        ):
            roots.add(rel)
        # avoid descending into ignored directories for this discovery pass
        dirs[:] = [
            d
            for d in dirs
            if d
            not in {
                "node_modules",
                ".git",
                "dist",
                "build",
                ".next",
                "venv",
                ".venv",
                "env",
            }
        ]
    return sorted(roots)


def _build_barrel_index(parsed_files: list[dict]) -> dict[str, str]:
    """Map barrel-like files to the nearest concrete module they expose.

    This is intentionally conservative: if an index/barrel file exists, we map
    it to itself so imports can at least resolve to the module node instead of
    being treated as external.
    """
    barrel_index: dict[str, str] = {}
    for pf in parsed_files:
        path = pf["path"]
        base = os.path.basename(path)
        if base.startswith("index.") or base == "index":
            barrel_index[os.path.normpath(path)] = path
            barrel_index[os.path.normpath(os.path.dirname(path))] = path
    return barrel_index


def _module_name_from_import(imp: str) -> str:
    if imp.startswith("@"):
        return imp.split("/")[0]
    parts = imp.split("/")
    return parts[0] if parts else imp
