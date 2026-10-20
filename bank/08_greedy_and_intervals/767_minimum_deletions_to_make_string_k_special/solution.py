from collections import Counter


def minimum_deletions(word: str, k: int) -> int:
    counts = list(Counter(word).values())
    best = len(word)
    for low in counts:
        deleted = 0
        for c in counts:
            if c < low:
                deleted += c
            elif c > low + k:
                deleted += c - low - k
        best = min(best, deleted)
    return best
