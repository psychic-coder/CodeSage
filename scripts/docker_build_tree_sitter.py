import sys
import tempfile
import os
from tree_sitter import Language


def main(out_path: str):
    tmp = tempfile.mkdtemp(prefix="ts_build_")
    try:
        js_dir = os.path.join(tmp, "tree-sitter-javascript")
        py_dir = os.path.join(tmp, "tree-sitter-python")
        os.system(f"git clone --depth 1 https://github.com/tree-sitter/tree-sitter-javascript.git {js_dir}")
        os.system(f"git clone --depth 1 https://github.com/tree-sitter/tree-sitter-python.git {py_dir}")
        Language.build_library(out_path, [js_dir, py_dir])
        print("Built:", out_path)
    finally:
        try:
            import shutil
            shutil.rmtree(tmp)
        except Exception:
            pass


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: python docker_build_tree_sitter.py /out/path/tree_sitter.so')
        sys.exit(2)
    main(sys.argv[1])
