import os, re
import chardet
from pathlib import Path
from app.services.parsing.language_detector import detect_language


def _read_safe(path: str) -> str | None:
    try:
        with open(path, "rb") as f:
            raw = f.read()
        if b'\x00' in raw[:512]:
            return None
        enc = chardet.detect(raw).get("encoding") or "utf-8"
        return raw.decode(enc, errors="replace")
    except Exception:
        return None


def parse_file(file_path: str, repo_root: str) -> dict | None:
    lang = detect_language(file_path)
    if not lang:
        return None
    source = _read_safe(file_path)
    if source is None:
        return None
    rel_path = os.path.relpath(file_path, repo_root)
    result = {
        "path": rel_path, "abs_path": file_path, "language": lang,
        "lines_of_code": len(source.splitlines()),
        "size_bytes": os.path.getsize(file_path),
        "imports": [], "functions": [], "classes": [], "exports": [],
        "complexity": 1, "partially_parsed": False,
    }
    try:
        if lang in ("javascript", "typescript"):
            _parse_js(source, result)
        elif lang == "html":
            _parse_html(source, result)
        elif lang == "python":
            _parse_py(source, result)
    except Exception:
        result["partially_parsed"] = True
    return result


def _parse_js(src: str, r: dict):
    for m in re.finditer(r'(?:import|require)\s*[\({]?\s*["\']([^"\']+)["\']', src):
        r["imports"].append(m.group(1))
    for m in re.finditer(r'export\s+(?:default\s+)?(?:function|class|const|let|var)\s+(\w+)', src):
        r["exports"].append(m.group(1))
    for m in re.finditer(r'(?:async\s+)?function\s+(\w+)\s*\(', src):
        r["functions"].append({"name": m.group(1), "is_async": "async" in m.group(0)})
    for m in re.finditer(r'class\s+(\w+)', src):
        r["classes"].append({"name": m.group(1)})
    r["complexity"] = len(re.findall(r'\b(if|else|for|while|switch|catch|\?|&&|\|\|)\b', src)) + 1


def _parse_py(src: str, r: dict):
    for m in re.finditer(r'^(?:from\s+(\S+)\s+)?import\s+(.+)', src, re.MULTILINE):
        r["imports"].append((m.group(1) or m.group(2).split()[0]).strip())
    for m in re.finditer(r'^(?:async\s+)?def\s+(\w+)\s*\(', src, re.MULTILINE):
        r["functions"].append({"name": m.group(1), "is_async": "async" in m.group(0)})
    for m in re.finditer(r'^class\s+(\w+)', src, re.MULTILINE):
        r["classes"].append({"name": m.group(1)})
    r["complexity"] = len(re.findall(r'\b(if|elif|else|for|while|except|and|or)\b', src)) + 1


def _parse_html(src: str, r: dict):
    # Treat local HTML asset references as graph edges so portfolio/static sites still produce useful structure.
    for m in re.finditer(r'<(?:script|link|iframe|source)\b[^>]*(?:src|href)=\s*["\']([^"\']+)["\']', src, re.IGNORECASE):
        r["imports"].append(m.group(1))

    for m in re.finditer(r'<title>(.*?)</title>', src, re.IGNORECASE | re.DOTALL):
        title = re.sub(r'\s+', ' ', m.group(1)).strip()
        if title:
            r["exports"].append(title)

    # HTML pages are treated as low-complexity entry files by default.
    r["complexity"] = len(re.findall(r'<(?!/)(?!meta\b)(?!link\b)(?!img\b)[a-zA-Z][^>]*>', src)) + 1