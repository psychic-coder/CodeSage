import html
import json, re


def sanitize_user_text(text: str, max_length: int = 2000) -> str:
    text = html.escape((text or "").strip())
    return text[:max_length]


def extract_json(text: str) -> dict | list | None:
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = re.search(r'```(?:json)?\s*([\s\S]+?)\s*```', text)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass
    for start_char, end_char in [('{', '}'), ('[', ']')]:
        start = text.find(start_char)
        if start != -1:
            end = text.rfind(end_char)
            if end > start:
                try:
                    return json.loads(text[start:end + 1])
                except json.JSONDecodeError:
                    pass
    return None


def validate_required_keys(parsed: dict | list | None, required_keys: list[str] | None = None) -> bool:
    if required_keys is None:
        return parsed is not None
    if not isinstance(parsed, dict):
        return False
    return all(key in parsed for key in required_keys)