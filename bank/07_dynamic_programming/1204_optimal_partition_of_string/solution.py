def partition_string(s: str) -> int:
    seen: set[str] = set()
    parts = 1
    for ch in s:
        if ch in seen:
            parts += 1
            seen = {ch}
        else:
            seen.add(ch)
    return parts
