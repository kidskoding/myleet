from collections import defaultdict


def solve_queries(nums: list[int], queries: list[int]) -> list[int]:
    n = len(nums)
    positions: dict[int, list[int]] = defaultdict(list)
    for i, value in enumerate(nums):
        positions[value].append(i)
    nearest = [-1] * n
    for idx in positions.values():
        m = len(idx)
        if m < 2:
            continue
        for j, i in enumerate(idx):
            forward = (idx[(j + 1) % m] - i) % n
            backward = (i - idx[j - 1]) % n
            nearest[i] = min(forward, backward)
    return [nearest[q] for q in queries]
