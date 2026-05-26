TARGET_TOKENS = 512
CHARS_PER_TOKEN = 4


def split_into_chunks(file_data: dict) -> list[dict]:
    source_lines = open(file_data["abs_path"], "r", errors="replace").readlines()
    target_chars = TARGET_TOKENS * CHARS_PER_TOKEN

    def line_slice(start_line: int, end_line: int) -> str:
        return "".join(source_lines[start_line:end_line])

    # Prefer semantic boundaries when parser data includes line spans.
    spans = []
    for entity in file_data.get("functions", []) + file_data.get("classes", []):
        start_line = entity.get("start_line")
        end_line = entity.get("end_line")
        if isinstance(start_line, int) and isinstance(end_line, int) and end_line >= start_line:
            spans.append((start_line - 1, end_line))

    spans = sorted(set(spans))
    chunks = []

    if spans:
        cursor = 0
        buffer_start = 0
        buffer_chars = 0
        buffer_end = 0

        def flush_buffer():
            nonlocal buffer_start, buffer_end, buffer_chars
            if buffer_end > buffer_start:
                chunks.append({
                    "file_path": file_data["path"],
                    "language": file_data["language"],
                    "start_line": buffer_start + 1,
                    "end_line": buffer_end,
                    "code": line_slice(buffer_start, buffer_end),
                })
            buffer_start = buffer_end = buffer_chars = 0

        for start, end in spans:
            # add any gap before the entity as a chunk if present
            if cursor < start:
                gap_text = line_slice(cursor, start)
                if gap_text.strip():
                    if buffer_end == buffer_start:
                        buffer_start = cursor
                    buffer_end = start
                    buffer_chars += len(gap_text)
                    if buffer_chars >= target_chars:
                        flush_buffer()
                cursor = start

            entity_text = line_slice(start, end)
            if buffer_end == buffer_start:
                buffer_start = start
            buffer_end = end
            buffer_chars += len(entity_text)
            if buffer_chars >= target_chars:
                flush_buffer()
            cursor = max(cursor, end)

        if cursor < len(source_lines):
            tail_text = line_slice(cursor, len(source_lines))
            if tail_text.strip():
                if buffer_end == buffer_start:
                    buffer_start = cursor
                buffer_end = len(source_lines)
                buffer_chars += len(tail_text)

        flush_buffer()
        return chunks

    current, start_line = [], 0
    current_chars = 0
    for i, line in enumerate(source_lines):
        current.append(line)
        current_chars += len(line)
        if current_chars >= target_chars:
            chunks.append({
                "file_path": file_data["path"],
                "language": file_data["language"],
                "start_line": start_line + 1,
                "end_line": i + 1,
                "code": "".join(current)
            })
            current, start_line, current_chars = [], i + 1, 0

    if current:
        chunks.append({
            "file_path": file_data["path"],
            "language": file_data["language"],
            "start_line": start_line + 1,
            "end_line": start_line + len(current),
            "code": "".join(current)
        })
    return chunks