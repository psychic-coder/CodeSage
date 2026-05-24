TARGET_TOKENS = 512
CHARS_PER_TOKEN = 4


def split_into_chunks(file_data: dict) -> list[dict]:
    source_lines = open(file_data["abs_path"], "r", errors="replace").readlines()
    chunks = []
    target_chars = TARGET_TOKENS * CHARS_PER_TOKEN
    current, start_line = [], 0
    current_chars = 0

    for i, line in enumerate(source_lines):
        current.append(line)
        current_chars += len(line)
        if current_chars >= target_chars:
            chunks.append({
                "file_path": file_data["path"], "language": file_data["language"],
                "start_line": start_line, "end_line": i,
                "code": "".join(current)
            })
            current, start_line, current_chars = [], i + 1, 0

    if current:
        chunks.append({
            "file_path": file_data["path"], "language": file_data["language"],
            "start_line": start_line, "end_line": start_line + len(current),
            "code": "".join(current)
        })
    return chunks