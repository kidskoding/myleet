def count_consistent_strings(allowed: str, words: list[str]) -> int:
    ok = set(allowed)
    return sum(1 for word in words if set(word) <= ok)
