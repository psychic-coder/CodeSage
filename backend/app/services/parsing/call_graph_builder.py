from __future__ import annotations


def build_call_graph(parsed_files: list[dict]) -> list[dict]:
    """Build CALLS edges from parsed file AST output.

    The parser already emits per-file call records; this helper normalizes them
    into a relationship list that graph construction can batch into Neo4j.
    Call targets are matched by function name when the callee is a simple
    identifier, and the best available file path is attached when resolvable.
    """

    function_index: dict[str, list[dict]] = {}
    for parsed in parsed_files:
        for fn in parsed.get("functions", []):
            function_index.setdefault(fn.get("name", ""), []).append(
                {
                    "file_path": parsed.get("path"),
                    "name": fn.get("name"),
                    "is_async": fn.get("is_async", False),
                }
            )

    relationships: list[dict] = []
    for parsed in parsed_files:
        caller_file = parsed.get("path")
        for call in parsed.get("calls", []):
            callee_name = _normalize_callee_name(call.get("callee", ""))
            if not callee_name:
                continue
            for candidate in function_index.get(callee_name, []):
                relationships.append(
                    {
                        "caller": call.get("caller"),
                        "callee": candidate.get("name"),
                        "caller_file_path": caller_file,
                        "callee_file_path": candidate.get("file_path"),
                        "line": call.get("line", 0),
                    }
                )
    return relationships


def _normalize_callee_name(callee: str) -> str:
    callee = (callee or "").strip()
    if not callee:
        return ""
    if "." in callee:
        callee = callee.split(".")[-1]
    if callee.endswith("()"):
        callee = callee[:-2]
    return callee
