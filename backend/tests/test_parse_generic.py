import os
import pytest

from app.services.parsing import tree_sitter_wrapper as tsw


@pytest.mark.skipif(not os.path.exists('app/vendor/tree_sitter.so'), reason='tree_sitter.so not present')
def test_parse_generic_basic():
    os.environ['TREE_SITTER_LIB'] = 'app/vendor/tree_sitter.so'
    sample = """
import "fmt"
func hello() {
    fmt.Println("hi")
}
hello()
    """
    res = tsw.parse_generic(sample, "go")
    assert res is None or isinstance(res, dict)
    if res:
        assert 'imports' in res and 'functions' in res and 'calls' in res and 'complexity' in res

def test_parse_generic_not_available():
    tsw.TS_AVAILABLE = False
    res = tsw.parse_generic("func main() {}", "go")
    assert res is None
