import os, re
import chardet
from pathlib import Path
from app.services.parsing.language_detector import detect_language
from app.services.parsing.tree_sitter_wrapper import parse_javascript, parse_python


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
            # Prefer tree-sitter when available for more accurate parsing
            ts_result = parse_javascript(source)
            if ts_result:
                result.update({
                    "imports": ts_result.get("imports", []),
                    "functions": ts_result.get("functions", []),
                    "classes": ts_result.get("classes", []),
                    "exports": ts_result.get("exports", []),
                    "calls": ts_result.get("calls", []),
                    "complexity": ts_result.get("complexity", 1),
                })
            else:
                _parse_js(source, result)
        elif lang == "html":
            _parse_html(source, result)
        elif lang == "python":
            ts_result = parse_python(source)
            if ts_result:
                result.update({
                    "imports": ts_result.get("imports", []),
                    "functions": ts_result.get("functions", []),
                    "classes": ts_result.get("classes", []),
                    "exports": ts_result.get("exports", []),
                    "calls": ts_result.get("calls", []),
                    "complexity": ts_result.get("complexity", 1),
                })
            else:
                _parse_py(source, result)
    except Exception:
        result["partially_parsed"] = True
    return result


def _parse_js(src: str, r: dict):
    # import ... from 'module'
    for m in re.finditer(r'import\s+(?:[\w\s\*{},]+\s+from\s+)?["\']([^"\']+)["\']', src):
        r["imports"].append(m.group(1))
    # require('module') or require("module")
    for m in re.finditer(r'require\(\s*["\']([^"\']+)["\']\s*\)', src):
        r["imports"].append(m.group(1))
    # dynamic import('module')
    for m in re.finditer(r'import\(\s*["\']([^"\']+)["\']\s*\)', src):
        r["imports"].append(m.group(1))
    # export ... from 'module'
    for m in re.finditer(r'export\s+.*\s+from\s+["\']([^"\']+)["\']', src):
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

    # Extract simple function-level call relationships
    _extract_calls_python(src, r)


def _parse_html(src: str, r: dict):
    # Treat local HTML asset references as graph edges so portfolio/static sites still produce useful structure.
    for m in re.finditer(r'<(?:script|link|iframe|source)\b[^>]*(?:src|href)=\s*["\']([^"\']+)["\']', src, re.IGNORECASE):
        imp = m.group(1).strip()
        # Ignore absolute URLs (CDNs, external embeds)
        if imp.startswith("http://") or imp.startswith("https://") or imp.startswith("//"):
            r["imports"].append(imp)
            continue
        # Normalize absolute repo-root paths and bare filenames to relative imports
        if imp.startswith('/'):
            imp = imp.lstrip('/')
        elif not imp.startswith('.') and not imp.startswith('/'):
            # make plain filenames relative so resolver can find them against file_dir
            imp = './' + imp
        r["imports"].append(imp)

    for m in re.finditer(r'<title>(.*?)</title>', src, re.IGNORECASE | re.DOTALL):
        title = re.sub(r'\s+', ' ', m.group(1)).strip()
        if title:
            r["exports"].append(title)

    # HTML pages are treated as low-complexity entry files by default.
    r["complexity"] = len(re.findall(r'<(?!/)(?!meta\b)(?!link\b)(?!img\b)[a-zA-Z][^>]*>', src)) + 1


def _extract_calls_javascript(src: str, r: dict):
    # Find function declaration positions
    funcs = []
    # function name(...) { }
    for m in re.finditer(r'function\s+(\w+)\s*\(', src):
        funcs.append((m.group(1), m.start()))
    # const name = function(...) or let/var
    for m in re.finditer(r'(?:const|let|var)\s+(\w+)\s*=\s*function\s*\(', src):
        funcs.append((m.group(1), m.start()))
    # arrow functions: const name = (...) =>
    for m in re.finditer(r'(?:const|let|var)\s+(\w+)\s*=\s*\(?[\w\s,]*\)?\s*=>', src):
        funcs.append((m.group(1), m.start()))

    funcs.sort(key=lambda x: x[1])
    call_pattern = re.compile(r'\b([A-Za-z_][A-Za-z0-9_]*)\s*\(')
    blacklist = {"if", "for", "while", "switch", "return", "function", "class", "new", "console", "require", "import"}
    calls = []
    for idx, (name, pos) in enumerate(funcs):
        start = pos
        end = funcs[idx + 1][1] if idx + 1 < len(funcs) else len(src)
        body = src[start:end]
        for m in call_pattern.finditer(body):
            callee = m.group(1)
            if callee in blacklist or callee == name:
                continue
            line_no = src[:start + m.start()].count('\n') + 1
            calls.append({"caller": name, "callee": callee, "line": line_no})
    r["calls"] = calls


def _extract_calls_python(src: str, r: dict):
    funcs = []
    for m in re.finditer(r'^(?:def|async def)\s+(\w+)\s*\(', src, re.MULTILINE):
        funcs.append((m.group(1), m.start()))
    funcs.sort(key=lambda x: x[1])
    call_pattern = re.compile(r'\b([A-Za-z_][A-Za-z0-9_]*)\s*\(')
    blacklist = {"if", "for", "while", "return", "with", "print", "assert", "yield"}
    calls = []
    for idx, (name, pos) in enumerate(funcs):
        start = pos
        end = funcs[idx + 1][1] if idx + 1 < len(funcs) else len(src)
        body = src[start:end]
        for m in call_pattern.finditer(body):
            callee = m.group(1)
            if callee in blacklist or callee == name:
                continue
            line_no = src[:start + m.start()].count('\n') + 1
            calls.append({"caller": name, "callee": callee, "line": line_no})
    r["calls"] = calls