from collections import defaultdict

GROUPS = ["ab", "cde", "fgh", "ijk", "lmn", "opq", "rst", "uvw", "xyz"]
VALUE = {ch: i + 1 for i, group in enumerate(GROUPS) for ch in group}


def count_divisible_substrings(word: str) -> int:
    values = [VALUE[ch] for ch in word]
    total = 0
    for avg in range(1, 10):
        seen: dict[int, int] = defaultdict(int)
        seen[0] = 1
        prefix = 0
        for v in values:
            prefix += v - avg
            total += seen[prefix]
            seen[prefix] += 1
    return total
