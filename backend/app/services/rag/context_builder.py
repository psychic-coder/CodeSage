MAX_CONTEXT_CHARS = 40_000


def build_context(chunks: list[dict]) -> str:
    context_parts = []
    total_chars = 0
    for chunk in chunks:
        snippet = (
            f"# File: {chunk.get('file_path', 'unknown')}\n{chunk.get('code', '')}"
        )
        if total_chars + len(snippet) > MAX_CONTEXT_CHARS:
            remaining = MAX_CONTEXT_CHARS - total_chars
            if remaining > 200:
                context_parts.append(snippet[:remaining] + "\n...[truncated]")
            break
        context_parts.append(snippet)
        total_chars += len(snippet)
    return "\n\n---\n\n".join(context_parts)
