def minimum_score(s: str, t: str) -> int:
    n, m = len(s), len(t)
    suffix = [m] * (n + 1)
    j = m
    for i in range(n - 1, -1, -1):
        if j > 0 and s[i] == t[j - 1]:
            j -= 1
        suffix[i] = j
    best = suffix[0]
    j = 0
    for i in range(n):
        if j < m and s[i] == t[j]:
            j += 1
            best = min(best, max(0, suffix[i + 1] - j))
    return best
