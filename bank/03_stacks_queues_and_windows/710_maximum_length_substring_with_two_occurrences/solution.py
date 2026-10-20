from collections import Counter


def maximum_length_substring(s: str) -> int:
    counts: Counter[str] = Counter()
    left = 0
    best = 0
    for right, ch in enumerate(s):
        counts[ch] += 1
        while counts[ch] > 2:
            counts[s[left]] -= 1
            left += 1
        best = max(best, right - left + 1)
    return best
