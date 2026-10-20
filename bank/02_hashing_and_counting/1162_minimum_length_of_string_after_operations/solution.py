from collections import Counter


def minimum_length(s: str) -> int:
    return sum(c if c < 3 else 2 - c % 2 for c in Counter(s).values())
