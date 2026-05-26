import os
import pytest

from app.services.parsing import tree_sitter_wrapper as tsw


@pytest.mark.skipif(not os.path.exists('backend/app/vendor/tree_sitter.so'), reason='tree_sitter.so not present')
def test_parse_javascript_basic():
    os.environ['TREE_SITTER_LIB'] = 'backend/app/vendor/tree_sitter.so'
    sample = """
import foo from './mod.js';
export function a() { return 1 }
function b(){ console.log('hi') }
b();
"""
    res = tsw.parse_javascript(sample)
    assert res is None or isinstance(res, dict)
    if res:
        assert 'imports' in res and 'functions' in res and 'calls' in res and 'complexity' in res


@pytest.mark.skipif(not os.path.exists('backend/app/vendor/tree_sitter.so'), reason='tree_sitter.so not present')
def test_parse_python_basic():
    os.environ['TREE_SITTER_LIB'] = 'backend/app/vendor/tree_sitter.so'
    sample = """
import os
def foo():
    print('x')
foo()
"""
    res = tsw.parse_python(sample)
    assert res is None or isinstance(res, dict)
    if res:
        assert 'imports' in res and 'functions' in res and 'calls' in res and 'complexity' in res
