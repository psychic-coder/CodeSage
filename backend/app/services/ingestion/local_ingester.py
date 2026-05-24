import os

ALLOWED = ["/mnt", "/repos", "/tmp"]


async def validate_local_path(path: str) -> str:
    abs_path = os.path.abspath(path)
    if not os.path.isdir(abs_path):
        raise ValueError(f"Not a directory: {abs_path}")
    if not any(abs_path.startswith(m) for m in ALLOWED):
        raise ValueError(f"Path not in allowed mount points")
    return abs_path