def longest_continuous_substring(s: str) -> int:
    best = run = 1
    for prev, cur in zip(s, s[1:]):
        run = run + 1 if ord(cur) - ord(prev) == 1 else 1
        best = max(best, run)
    return best
