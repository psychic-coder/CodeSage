import os
import tarfile
import tempfile
import zipfile
from pathlib import Path


def _safe_join(root: str, member_name: str) -> str | None:
    candidate = Path(root, member_name).resolve()
    root_path = Path(root).resolve()
    if root_path == candidate or root_path in candidate.parents:
        return str(candidate)
    return None


async def extract_zip(zip_path: str) -> str:
    tmp = tempfile.mkdtemp(prefix="codesage_zip_")
    if zip_path.endswith((".tar.gz", ".tgz")):
        with tarfile.open(zip_path, "r:gz") as tf:
            for member in tf.getmembers():
                if member.isdir() or member.issym() or member.islnk():
                    continue
                safe = _safe_join(tmp, member.name)
                if not safe:
                    continue
                if member.name.endswith((".zip", ".tar", ".tar.gz", ".tgz")):
                    continue
                target_dir = os.path.dirname(safe)
                os.makedirs(target_dir, exist_ok=True)
                extracted = tf.extractfile(member)
                if extracted is None:
                    continue
                with open(safe, "wb") as out:
                    out.write(extracted.read())
    else:
        with zipfile.ZipFile(zip_path, "r") as zf:
            for member in zf.infolist():
                if member.is_dir():
                    continue
                safe = _safe_join(tmp, member.filename)
                if not safe:
                    continue
                if member.filename.endswith((".zip", ".tar", ".tar.gz", ".tgz")):
                    continue
                os.makedirs(os.path.dirname(safe), exist_ok=True)
                with zf.open(member, pwd=None) as src, open(safe, "wb") as out:
                    out.write(src.read())
    entries = os.listdir(tmp)
    if len(entries) == 1 and os.path.isdir(os.path.join(tmp, entries[0])):
        return os.path.join(tmp, entries[0])
    return tmp
