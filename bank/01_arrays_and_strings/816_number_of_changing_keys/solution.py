def count_key_changes(s: str) -> int:
    lowered = s.lower()
    return sum(1 for i in range(1, len(lowered)) if lowered[i] != lowered[i - 1])
