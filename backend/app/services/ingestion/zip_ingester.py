import zipfile, tarfile, tempfile, os


async def extract_zip(zip_path: str) -> str:
    tmp = tempfile.mkdtemp(prefix="codesage_zip_")
    if zip_path.endswith((".tar.gz", ".tgz")):
        with tarfile.open(zip_path, "r:gz") as tf:
            for member in tf.getmembers():
                safe = os.path.normpath(os.path.join(tmp, member.name))
                if not safe.startswith(tmp):
                    continue
                tf.extract(member, tmp)
    else:
        with zipfile.ZipFile(zip_path, "r") as zf:
            for member in zf.infolist():
                safe = os.path.normpath(os.path.join(tmp, member.filename))
                if not safe.startswith(tmp):
                    continue
                zf.extract(member, tmp)
    entries = os.listdir(tmp)
    if len(entries) == 1 and os.path.isdir(os.path.join(tmp, entries[0])):
        return os.path.join(tmp, entries[0])
    return tmp