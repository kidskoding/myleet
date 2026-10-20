def min_operations(s: str) -> int:
    mismatches = sum(int(ch) != i % 2 for i, ch in enumerate(s))
    return min(mismatches, len(s) - mismatches)
