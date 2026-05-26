import os
from pathlib import Path

ALLOWED = ["/mnt", "/repos", "/tmp"]


async def validate_local_path(path: str) -> str:
    abs_path = Path(path).expanduser().resolve()
    if not abs_path.is_dir():
        raise ValueError(f"Not a directory: {abs_path}")
    if not any(str(abs_path).startswith(os.path.abspath(m)) for m in ALLOWED):
        raise ValueError("Path not in allowed mount points")
    return str(abs_path)