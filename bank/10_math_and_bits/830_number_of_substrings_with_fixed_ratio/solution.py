from collections import defaultdict


def fixed_ratio(s: str, num1: int, num2: int) -> int:
    seen: dict[int, int] = defaultdict(int)
    seen[0] = 1
    score = 0
    total = 0
    for ch in s:
        score += num2 if ch == "0" else -num1
        total += seen[score]
        seen[score] += 1
    return total
