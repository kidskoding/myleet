from collections import Counter


def find_valid_pair(s: str) -> str:
    counts = Counter(s)
    for a, b in zip(s, s[1:]):
        if a != b and counts[a] == int(a) and counts[b] == int(b):
            return a + b
    return ""
