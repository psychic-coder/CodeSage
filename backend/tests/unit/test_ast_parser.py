"""Unit tests for ast_parser.py — cyclomatic complexity, imports, functions, classes.

Conftest stubs external services so no live infrastructure is needed.
"""
from app.services.parsing.ast_parser import _parse_js, _parse_py, _parse_html


# ─────────────────────────────────────────────────────────────────────────────
# Python parser tests
# ─────────────────────────────────────────────────────────────────────────────

class TestParsePython:
    def _blank(self) -> dict:
        return {"imports": [], "functions": [], "classes": [], "exports": [], "calls": [], "complexity": 1}

    def test_imports_plain(self):
        r = self._blank()
        _parse_py("import os\nimport sys", r)
        assert "os" in r["imports"]
        assert "sys" in r["imports"]

    def test_imports_from(self):
        r = self._blank()
        _parse_py("from pathlib import Path\nfrom typing import List", r)
        assert "pathlib" in r["imports"]
        assert "typing" in r["imports"]

    def test_function_extraction(self):
        r = self._blank()
        src = "def foo():\n    pass\nasync def bar():\n    pass"
        _parse_py(src, r)
        names = [f["name"] for f in r["functions"]]
        assert "foo" in names
        assert "bar" in names

    def test_async_flag(self):
        r = self._blank()
        _parse_py("async def run():\n    pass", r)
        assert r["functions"][0]["is_async"] is True

    def test_class_extraction(self):
        r = self._blank()
        _parse_py("class MyClass:\n    pass\nclass AnotherClass(Base):\n    pass", r)
        names = [c["name"] for c in r["classes"]]
        assert "MyClass" in names
        assert "AnotherClass" in names

    def test_complexity_counts_branches(self):
        r = self._blank()
        src = "if True:\n    pass\nelif True:\n    pass\nelse:\n    pass\nfor i in range(10):\n    pass"
        _parse_py(src, r)
        # 1 base + if + elif + else + for = 5
        assert r["complexity"] >= 4

    def test_complexity_single_function(self):
        r = self._blank()
        _parse_py("def f():\n    return 1", r)
        # No branches → complexity == 1 base
        assert r["complexity"] == 1

    def test_call_graph_extraction(self):
        r = self._blank()
        src = "def caller():\n    callee()\n    helper()\ndef callee():\n    pass\ndef helper():\n    pass"
        _parse_py(src, r)
        caller_calls = [c["callee"] for c in r.get("calls", []) if c["caller"] == "caller"]
        assert "callee" in caller_calls or "helper" in caller_calls


# ─────────────────────────────────────────────────────────────────────────────
# JavaScript parser tests
# ─────────────────────────────────────────────────────────────────────────────

class TestParseJavaScript:
    def _blank(self) -> dict:
        return {"imports": [], "functions": [], "classes": [], "exports": [], "calls": [], "complexity": 1}

    def test_es_module_imports(self):
        r = self._blank()
        _parse_js("import React from 'react';\nimport { useState } from 'react';", r)
        assert "react" in r["imports"]

    def test_require_imports(self):
        r = self._blank()
        _parse_js("const path = require('path');\nconst fs = require('fs');", r)
        assert "path" in r["imports"]
        assert "fs" in r["imports"]

    def test_dynamic_import(self):
        r = self._blank()
        _parse_js("const mod = import('./module.js');", r)
        assert "./module.js" in r["imports"]

    def test_function_extraction(self):
        r = self._blank()
        src = "function greet(name) { return name; }\nasync function fetchData() { return []; }"
        _parse_js(src, r)
        names = [f["name"] for f in r["functions"]]
        assert "greet" in names
        assert "fetchData" in names

    def test_async_function_flag(self):
        r = self._blank()
        _parse_js("async function load() {}", r)
        assert r["functions"][0]["is_async"] is True

    def test_class_extraction(self):
        r = self._blank()
        _parse_js("class Animal {}\nclass Dog extends Animal {}", r)
        names = [c["name"] for c in r["classes"]]
        assert "Animal" in names
        assert "Dog" in names

    def test_named_export(self):
        r = self._blank()
        _parse_js("export function helper() {}\nexport const PI = 3.14;", r)
        assert "helper" in r["exports"] or "PI" in r["exports"]

    def test_complexity_increases_with_branches(self):
        r = self._blank()
        src = "function f() { if (a) { } else { } for (;;) { } while (x) { } }"
        _parse_js(src, r)
        # 1 base + if + else + for + while = 5
        assert r["complexity"] >= 4

    def test_complexity_no_branches(self):
        r = self._blank()
        _parse_js("function f() { return 1; }", r)
        assert r["complexity"] == 1


# ─────────────────────────────────────────────────────────────────────────────
# HTML parser tests
# ─────────────────────────────────────────────────────────────────────────────

class TestParseHTML:
    def _blank(self) -> dict:
        return {"imports": [], "functions": [], "classes": [], "exports": [], "calls": [], "complexity": 1}

    def test_script_src_captured(self):
        r = self._blank()
        _parse_html('<script src="./app.js"></script>', r)
        assert any("app.js" in imp for imp in r["imports"])

    def test_link_href_captured(self):
        r = self._blank()
        _parse_html('<link rel="stylesheet" href="./style.css">', r)
        assert any("style.css" in imp for imp in r["imports"])

    def test_external_urls_included(self):
        r = self._blank()
        _parse_html('<script src="https://cdn.example.com/lib.js"></script>', r)
        assert any("cdn.example.com" in imp for imp in r["imports"])

    def test_title_extracted_as_export(self):
        r = self._blank()
        _parse_html("<title>My App</title>", r)
        assert "My App" in r["exports"]

    def test_complexity_counts_tags(self):
        r = self._blank()
        html = "<div><p>Hello</p><section><article></article></section></div>"
        _parse_html(html, r)
        assert r["complexity"] >= 4
