import tempfile, re
from git import Repo
from app.config import settings

GITHUB_RE = re.compile(r'^https://github\.com/([a-zA-Z0-9_.-]+)/([a-zA-Z0-9_.-]+)')


async def clone_github_repo(url: str) -> str:
    if not GITHUB_RE.match(url):
        raise ValueError("Invalid GitHub URL")
    tmp = tempfile.mkdtemp(prefix="codesage_repo_")
    clone_url = url.split("/tree/")[0].rstrip("/")
    branch = None
    if "/tree/" in url:
        branch = url.split("/tree/", 1)[1].split("/", 1)[0]
    if settings.github_personal_token:
        clone_url = clone_url.replace(
            "https://github.com", f"https://{settings.github_personal_token}@github.com"
        )
    try:
        clone_kwargs = {"depth": 1}
        if branch:
            clone_kwargs["branch"] = branch
        Repo.clone_from(clone_url, tmp, **clone_kwargs)
    except Exception:
        # Fallback to a default-branch shallow clone if the requested branch is invalid.
        Repo.clone_from(clone_url, tmp, depth=1)
    return tmp