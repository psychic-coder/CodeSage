from pathlib import Path

EXT_MAP = {
    '.js': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
    '.ts': 'typescript', '.tsx': 'typescript', '.jsx': 'javascript',
    '.html': 'html', '.htm': 'html',
    '.py': 'python', '.java': 'java', '.go': 'go', '.rs': 'rust',
    '.c': 'c', '.h': 'c', '.cpp': 'cpp', '.cc': 'cpp',
    '.rb': 'ruby', '.php': 'php', '.cs': 'csharp',
    '.swift': 'swift', '.kt': 'kotlin',
}


def detect_language(file_path: str) -> str | None:
    return EXT_MAP.get(Path(file_path).suffix.lower())