#!/usr/bin/env python3
"""
scripts/benchmark.py — CodeSage performance benchmark

Measures ingestion and analysis latency against a local repository and
prints a report that validates the spec targets:
  - Ingestion of ≤1000 files:  < 180 seconds (3 min)
  - Analysis endpoint response: < 10 seconds

Usage:
    python scripts/benchmark.py --repo ./path/to/repo --base-url http://localhost:8000

Requirements:
    pip install httpx rich
"""
import argparse
import os
import sys
import time
from pathlib import Path

try:
    import httpx
    from rich.console import Console
    from rich.table import Table
    from rich import box
except ImportError:
    print("Install benchmark deps first:  pip install httpx rich")
    sys.exit(1)

console = Console()

# ── Helpers ──────────────────────────────────────────────────────────────────

def count_files(repo_path: Path) -> int:
    return sum(1 for _ in repo_path.rglob("*") if _.is_file())


def login(base: str, email: str, password: str) -> str:
    r = httpx.post(f"{base}/api/v1/auth/login", json={"email": email, "password": password}, timeout=10)
    r.raise_for_status()
    return r.json()["access_token"]


def ingest(base: str, token: str, repo_path: str) -> tuple[str, float]:
    headers = {"Authorization": f"Bearer {token}"}
    t0 = time.perf_counter()
    r = httpx.post(
        f"{base}/api/v1/ingest/local",
        json={"name": "benchmark-repo", "source_type": "local", "source_path": repo_path},
        headers=headers,
        timeout=30,
    )
    r.raise_for_status()
    data = r.json()
    project_id = data.get("project_id") or data.get("id")

    # Poll until complete
    for _ in range(300):  # max 5 min
        time.sleep(1)
        status_r = httpx.get(f"{base}/api/v1/projects/{project_id}", headers=headers, timeout=10)
        status_r.raise_for_status()
        status = status_r.json().get("status", "")
        if status == "ready":
            break
        if status == "failed":
            console.print(f"[red]Ingestion failed:[/red] {status_r.json().get('error_message')}")
            sys.exit(1)

    elapsed = time.perf_counter() - t0
    return project_id, elapsed


def benchmark_analysis(base: str, token: str, project_id: str, endpoint: str, payload: dict) -> float:
    headers = {"Authorization": f"Bearer {token}"}
    t0 = time.perf_counter()
    r = httpx.post(
        f"{base}/api/v1/analysis/{endpoint}",
        json={"project_id": project_id, **payload},
        headers=headers,
        timeout=30,
    )
    elapsed = time.perf_counter() - t0
    if r.status_code != 200:
        console.print(f"[yellow]  {endpoint} returned {r.status_code}[/yellow]")
    return elapsed


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="CodeSage performance benchmark")
    parser.add_argument("--repo", default=".", help="Path to repository to ingest")
    parser.add_argument("--base-url", default="http://localhost:8000", help="Backend base URL")
    parser.add_argument("--email", default=os.getenv("CODESAGE_EMAIL", "admin@codesage.local"))
    parser.add_argument("--password", default=os.getenv("CODESAGE_PASSWORD", "changeme"))
    args = parser.parse_args()

    repo_path = Path(args.repo).resolve()
    if not repo_path.exists():
        console.print(f"[red]Repository path not found:[/red] {repo_path}")
        sys.exit(1)

    file_count = count_files(repo_path)
    console.rule(f"[bold blue]CodeSage Benchmark")
    console.print(f"  Repository : [cyan]{repo_path}[/cyan]")
    console.print(f"  File count : [cyan]{file_count}[/cyan]")
    console.print(f"  Base URL   : [cyan]{args.base_url}[/cyan]\n")

    # Auth
    console.print("[dim]Authenticating…[/dim]")
    try:
        token = login(args.base_url, args.email, args.password)
    except Exception as e:
        console.print(f"[red]Auth failed:[/red] {e}")
        sys.exit(1)

    # Ingestion
    console.print("[dim]Starting ingestion…[/dim]")
    project_id, ingest_secs = ingest(args.base_url, token, str(repo_path))
    console.print(f"  Ingestion completed in [bold]{ingest_secs:.1f}s[/bold]")

    # Analysis endpoints
    analysis_results = {}
    for name, endpoint, payload in [
        ("propagation", "propagation", {"file_path": "README.md", "change_type": "modify"}),
        ("improvements", "improvements", {}),
        ("architecture", "architecture", {}),
        ("query",        "../../query",  {"query": "What are the most complex modules?"}),
    ]:
        console.print(f"[dim]Benchmarking {name}…[/dim]")
        try:
            elapsed = benchmark_analysis(args.base_url, token, project_id, endpoint, payload)
            analysis_results[name] = elapsed
        except Exception as e:
            analysis_results[name] = None
            console.print(f"  [yellow]{name} error: {e}[/yellow]")

    # Report
    console.print()
    table = Table(title="Benchmark Results", box=box.ROUNDED, show_lines=True)
    table.add_column("Metric", style="bold")
    table.add_column("Measured", justify="right")
    table.add_column("Target", justify="right")
    table.add_column("Status", justify="center")

    def _status(measured: float, target: float) -> str:
        return "[green]✓ PASS[/green]" if measured <= target else "[red]✗ FAIL[/red]"

    table.add_row(
        f"Ingestion ({file_count} files)",
        f"{ingest_secs:.1f}s",
        "< 180s",
        _status(ingest_secs, 180),
    )

    for name, elapsed in analysis_results.items():
        if elapsed is None:
            table.add_row(name, "error", "< 10s", "[yellow]? SKIP[/yellow]")
        else:
            table.add_row(name, f"{elapsed:.2f}s", "< 10s", _status(elapsed, 10))

    console.print(table)

    # Exit code
    all_pass = ingest_secs <= 180 and all(
        v is not None and v <= 10 for v in analysis_results.values()
    )
    sys.exit(0 if all_pass else 1)


if __name__ == "__main__":
    main()
