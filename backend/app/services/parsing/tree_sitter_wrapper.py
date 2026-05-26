"""Lightweight tree-sitter integration shim.

This module provides a safe, optional integration point for tree-sitter parsing.
If the `tree_sitter` package and compiled language library are available, the
functions will attempt to use them. Otherwise they return None so callers can
fall back to the regex-based parsers in `ast_parser.py`.

The project can later add prebuilt language bundles (eg. vendor/tree_sitter.so)
and set TREE_SITTER_LIB to point at them to enable full tree-sitter support.
"""
import os
from typing import Optional, Dict, Any

TS_AVAILABLE = False
try:
    from tree_sitter import Language, Parser  # type: ignore
    TS_AVAILABLE = True
except Exception:
    TS_AVAILABLE = False


def _load_language(lib_path: str, lang_name: str):
    if not TS_AVAILABLE:
        return None
    if not os.path.exists(lib_path):
        return None
    try:
        Language.build_library(lib_path, [])
    except Exception:
        # building may not be applicable in this environment
        pass
    try:
        return Language(lib_path, lang_name)
    except Exception:
        return None


def parse_javascript(source: str) -> Optional[Dict[str, Any]]:
    """Attempt to parse JavaScript/TypeScript using tree-sitter.

    Returns a dict with keys: imports, functions, classes, exports, complexity
    or None if tree-sitter is unavailable or parsing fails.
    """
    if not TS_AVAILABLE:
        return None
    # Optional compiled library path via env var; caller may provide a shared lib
    lib = os.environ.get("TREE_SITTER_LIB")
    lang = None
    if lib:
        lang = _load_language(lib, "javascript")
    if not lang:
        return None
    try:
        parser = Parser()
        parser.set_language(lang)
        src_bytes = bytes(source, "utf8")
        tree = parser.parse(src_bytes)
        root = tree.root_node

        imports: list[str] = []
        functions: list[dict] = []
        classes: list[dict] = []
        exports: list[str] = []
        calls: list[dict] = []
        complexity = 1

        # collect function ranges for caller resolution
        func_ranges: list[tuple[int, int, str]] = []

        def walk(node):
            yield node
            for c in node.children:
                yield from walk(c)

        for node in walk(root):
            t = node.type
            # imports: import_statement or string literal in require call
            if t == "import_statement":
                # find string literal child
                for c in node.children:
                    if c.type == "string":
                        val = src_bytes[c.start_byte:c.end_byte].decode("utf8", errors="ignore").strip('"\'')
                        imports.append(val)
            # require('x') or call_expression with require identifier
            if t == "call_expression":
                # callee node is first child
                callee = node.child_by_field_name("function") or (node.children[0] if node.children else None)
                if callee is not None:
                    callee_text = src_bytes[callee.start_byte:callee.end_byte].decode("utf8", errors="ignore")
                    # simple require detection
                    if callee_text.strip().startswith("require"):
                        # get arg string
                        for ch in node.children:
                            if ch.type == "string":
                                val = src_bytes[ch.start_byte:ch.end_byte].decode("utf8", errors="ignore").strip('"\'')
                                imports.append(val)
                    # dynamic import() is a call with 'import' callee
                    if callee_text.strip().startswith("import"):
                        for ch in node.children:
                            if ch.type == "string":
                                val = src_bytes[ch.start_byte:ch.end_byte].decode("utf8", errors="ignore").strip('"\'')
                                imports.append(val)

            # export statements
            if t == "export_statement":
                for c in node.children:
                    if c.type == "identifier" or c.type == "property_identifier":
                        exports.append(src_bytes[c.start_byte:c.end_byte].decode("utf8", errors="ignore"))

            # function declarations
            if t in ("function_declaration", "method_definition"):
                # try to get identifier child
                name_node = None
                for c in node.children:
                    if c.type == "identifier" or c.type == "property_identifier":
                        name_node = c
                        break
                name = src_bytes[name_node.start_byte:name_node.end_byte].decode("utf8", errors="ignore") if name_node else "<anon>"
                functions.append({
                    "name": name,
                    "is_async": "async" in node.type,
                    "start_line": node.start_point[0] + 1,
                    "end_line": node.end_point[0] + 1,
                })
                func_ranges.append((node.start_byte, node.end_byte, name))

            # class declarations
            if t == "class_declaration":
                name_node = None
                for c in node.children:
                    if c.type == "identifier":
                        name_node = c
                        break
                name = src_bytes[name_node.start_byte:name_node.end_byte].decode("utf8", errors="ignore") if name_node else "<anon>"
                classes.append({
                    "name": name,
                    "start_line": node.start_point[0] + 1,
                    "end_line": node.end_point[0] + 1,
                })

            # call expressions -> record for call-graph
            if t == "call_expression":
                # determine callee text
                callee = node.child_by_field_name("function") or (node.children[0] if node.children else None)
                if callee:
                    callee_text = src_bytes[callee.start_byte:callee.end_byte].decode("utf8", errors="ignore")
                else:
                    callee_text = "<unknown>"
                # find containing function
                caller = "<module>"
                for (s, e, fname) in func_ranges:
                    if node.start_byte >= s and node.start_byte < e:
                        caller = fname
                        break
                calls.append({"caller": caller, "callee": callee_text, "line": node.start_point[0] + 1})

            # complexity heuristics: count control-flow tokens
            if t in ("if_statement", "for_statement", "while_statement", "switch_statement", "catch_clause"):
                complexity += 1

        return {
            "imports": imports,
            "functions": functions,
            "classes": classes,
            "exports": exports,
            "calls": calls,
            "complexity": complexity,
        }
    except Exception:
        return None


def parse_python(source: str) -> Optional[Dict[str, Any]]:
    """Attempt to parse Python using tree-sitter. See `parse_javascript`.
    Returns None if not available.
    """
    if not TS_AVAILABLE:
        return None
    lib = os.environ.get("TREE_SITTER_LIB")
    lang = None
    if lib:
        lang = _load_language(lib, "python")
    if not lang:
        return None
    try:
        parser = Parser()
        parser.set_language(lang)
        src_bytes = bytes(source, "utf8")
        tree = parser.parse(src_bytes)
        root = tree.root_node

        imports: list[str] = []
        functions: list[dict] = []
        classes: list[dict] = []
        exports: list[str] = []
        calls: list[dict] = []
        complexity = 1

        func_ranges: list[tuple[int, int, str]] = []

        def walk(node):
            yield node
            for c in node.children:
                yield from walk(c)

        for node in walk(root):
            t = node.type
            if t in ("import_statement", "import_from_statement"):
                # collect module names or aliases
                text = src_bytes[node.start_byte:node.end_byte].decode("utf8", errors="ignore")
                # crude split by whitespace, keep last token after from/import
                for m in ("from ", "import "):
                    if m in text:
                        parts = text.split()
                        # simple heuristic
                        if parts:
                            imports.append(parts[-1].strip())
                        break

            if t == "function_definition":
                # child 'name' node may exist
                name_node = None
                for c in node.children:
                    if c.type == "identifier":
                        name_node = c
                        break
                name = src_bytes[name_node.start_byte:name_node.end_byte].decode("utf8", errors="ignore") if name_node else "<anon>"
                functions.append({
                    "name": name,
                    "is_async": False,
                    "start_line": node.start_point[0] + 1,
                    "end_line": node.end_point[0] + 1,
                })
                func_ranges.append((node.start_byte, node.end_byte, name))

            if t == "class_definition":
                name_node = None
                for c in node.children:
                    if c.type == "identifier":
                        name_node = c
                        break
                name = src_bytes[name_node.start_byte:name_node.end_byte].decode("utf8", errors="ignore") if name_node else "<anon>"
                classes.append({
                    "name": name,
                    "start_line": node.start_point[0] + 1,
                    "end_line": node.end_point[0] + 1,
                })

            if t == "call":
                # callee is first child usually
                callee_node = node.children[0] if node.children else None
                callee_text = src_bytes[callee_node.start_byte:callee_node.end_byte].decode("utf8", errors="ignore") if callee_node else "<unknown>"
                caller = "<module>"
                for (s, e, fname) in func_ranges:
                    if node.start_byte >= s and node.start_byte < e:
                        caller = fname
                        break
                calls.append({"caller": caller, "callee": callee_text, "line": node.start_point[0] + 1})

            if t in ("if_statement", "for_statement", "while_statement", "except_clause"):
                complexity += 1

        return {
            "imports": imports,
            "functions": functions,
            "classes": classes,
            "exports": exports,
            "calls": calls,
            "complexity": complexity,
        }
    except Exception:
        return None


def parse_generic(source: str, lang_name: str) -> Optional[Dict[str, Any]]:
    """Attempt to parse generic language using tree-sitter.
    Returns None if not available.
    """
    if not TS_AVAILABLE:
        return None
    lib = os.environ.get("TREE_SITTER_LIB")
    lang = None
    if lib:
        lang = _load_language(lib, lang_name)
    if not lang:
        return None
    try:
        parser = Parser()
        parser.set_language(lang)
        src_bytes = bytes(source, "utf8")
        tree = parser.parse(src_bytes)
        root = tree.root_node

        imports: list[str] = []
        functions: list[dict] = []
        classes: list[dict] = []
        exports: list[str] = []
        calls: list[dict] = []
        complexity = 1

        func_ranges: list[tuple[int, int, str]] = []

        def walk(node):
            yield node
            for c in node.children:
                yield from walk(c)

        for node in walk(root):
            t = node.type
            if "import" in t or "include" in t or "require" in t:
                for c in node.children:
                    if c.type == "string" or c.type == "identifier" or "string" in c.type:
                        val = src_bytes[c.start_byte:c.end_byte].decode("utf8", errors="ignore").strip('"\'')
                        if val:
                            imports.append(val)
            
            if "function" in t or "method" in t or "func" in t:
                name = "<anon>"
                for c in node.children:
                    if "identifier" in c.type or "name" in c.type:
                        name = src_bytes[c.start_byte:c.end_byte].decode("utf8", errors="ignore")
                        break
                functions.append({
                    "name": name,
                    "is_async": "async" in t,
                    "start_line": node.start_point[0] + 1,
                    "end_line": node.end_point[0] + 1,
                })
                func_ranges.append((node.start_byte, node.end_byte, name))
                
            if "class" in t or "struct" in t or "interface" in t:
                name = "<anon>"
                for c in node.children:
                    if "identifier" in c.type or "name" in c.type:
                        name = src_bytes[c.start_byte:c.end_byte].decode("utf8", errors="ignore")
                        break
                classes.append({
                    "name": name,
                    "start_line": node.start_point[0] + 1,
                    "end_line": node.end_point[0] + 1,
                })

            if "call" in t:
                callee_node = node.children[0] if node.children else None
                callee_text = src_bytes[callee_node.start_byte:callee_node.end_byte].decode("utf8", errors="ignore") if callee_node else "<unknown>"
                caller = "<module>"
                for (s, e, fname) in func_ranges:
                    if node.start_byte >= s and node.start_byte < e:
                        caller = fname
                        break
                calls.append({"caller": caller, "callee": callee_text, "line": node.start_point[0] + 1})

            if t in ("if_statement", "for_statement", "while_statement", "catch_clause", "except_clause"):
                complexity += 1

        return {
            "imports": imports,
            "functions": functions,
            "classes": classes,
            "exports": exports,
            "calls": calls,
            "complexity": complexity,
        }
    except Exception:
        return None
