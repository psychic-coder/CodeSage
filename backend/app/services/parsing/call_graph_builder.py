from __future__ import annotations


def build_call_graph(parsed_files: list[dict]) -> list[dict]:
    """Build CALLS edges from parsed file AST output.

    The parser already emits per-file call records; this helper normalizes them
    into a relationship list that graph construction can batch into Neo4j.
    Call targets are matched by function name when the callee is a simple
    identifier, and the best available file path is attached when resolvable.
    """

    # Index functions by (file_path, function_name)
    file_func_map = {}
    for parsed in parsed_files:
        for fn in parsed.get("functions", []):
            file_func_map[(parsed.get("path"), fn.get("name"))] = fn

    relationships = []
    for parsed in parsed_files:
        caller_file = parsed.get("path")
        
        # Candidate files for resolution (local + direct imports)
        candidate_files = {caller_file}
        for imp in parsed.get("resolved_imports", []):
            if imp.get("resolved"):
                candidate_files.add(imp["resolved"])

        for call in parsed.get("calls", []):
            callee_name = _normalize_callee_name(call.get("callee", ""))
            if not callee_name:
                continue

            # 1. Check local file first
            if (caller_file, callee_name) in file_func_map:
                relationships.append({
                    "caller": call.get("caller"),
                    "callee": callee_name,
                    "caller_file_path": caller_file,
                    "callee_file_path": caller_file,
                    "line": call.get("line", 0),
                })
                continue

            # 2. Check directly imported files
            matched = False
            for cfile in candidate_files:
                if cfile != caller_file and (cfile, callee_name) in file_func_map:
                    relationships.append({
                        "caller": call.get("caller"),
                        "callee": callee_name,
                        "caller_file_path": caller_file,
                        "callee_file_path": cfile,
                        "line": call.get("line", 0),
                    })
                    matched = True
            
            if matched:
                continue

            # 3. Global fallback for unresolved or method calls (e.g. obj.method)
            for (fpath, fname) in file_func_map.keys():
                if fname == callee_name:
                    relationships.append({
                        "caller": call.get("caller"),
                        "callee": callee_name,
                        "caller_file_path": caller_file,
                        "callee_file_path": fpath,
                        "line": call.get("line", 0),
                    })
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
