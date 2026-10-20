from collections import defaultdict


def longest_equal_subarray(nums: list[int], k: int) -> int:
    positions: dict[int, list[int]] = defaultdict(list)
    for i, v in enumerate(nums):
        positions[v].append(i)
    best = 0
    for pos in positions.values():
        left = 0
        for right in range(len(pos)):
            while pos[right] - pos[left] - (right - left) > k:
                left += 1
            best = max(best, right - left + 1)
    return best
