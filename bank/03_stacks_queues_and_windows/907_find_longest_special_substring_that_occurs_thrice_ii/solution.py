from collections import defaultdict


def maximum_length(s: str) -> int:
    runs: dict[str, list[int]] = defaultdict(list)
    i = 0
    while i < len(s):
        j = i
        while j < len(s) and s[j] == s[i]:
            j += 1
        runs[s[i]].append(j - i)
        i = j
    best = 0
    for lengths in runs.values():
        top = sorted(lengths, reverse=True)[:3] + [0, 0]
        a, b, c = top[0], top[1], top[2]
        best = max(best, a - 2, min(a - 1, b), c)
    return best if best > 0 else -1
