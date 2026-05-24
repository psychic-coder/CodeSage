import os

EXTS = ['.js', '.ts', '.jsx', '.tsx', '.py', '.mjs']


def resolve_all_imports(parsed_files: list[dict], repo_root: str) -> list[dict]:
    path_index = {pf["path"] for pf in parsed_files}
    for pf in parsed_files:
        resolved = []
        file_dir = os.path.dirname(pf["path"])
        for imp in pf["imports"]:
            if imp.startswith("."):
                target = _resolve_relative(imp, file_dir, path_index)
                resolved.append({"raw": imp, "resolved": target, "is_external": target is None})
            else:
                resolved.append({"raw": imp, "resolved": None, "is_external": True})
        pf["resolved_imports"] = resolved
    return parsed_files


def _resolve_relative(imp: str, file_dir: str, path_index: set) -> str | None:
    base = os.path.normpath(os.path.join(file_dir, imp))
    if base in path_index:
        return base
    for ext in EXTS:
        if base + ext in path_index:
            return base + ext
    for ext in EXTS:
        candidate = os.path.join(base, "index" + ext)
        if candidate in path_index:
            return candidate
    return None