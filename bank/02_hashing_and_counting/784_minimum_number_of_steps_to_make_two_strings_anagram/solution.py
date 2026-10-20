from collections import Counter


def min_steps(s: str, t: str) -> int:
    return sum((Counter(s) - Counter(t)).values())
