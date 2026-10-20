from collections import defaultdict


def distance(nums: list[int]) -> list[int]:
    groups: dict[int, list[int]] = defaultdict(list)
    for i, x in enumerate(nums):
        groups[x].append(i)
    out = [0] * len(nums)
    for idxs in groups.values():
        total = sum(idxs)
        left_sum = 0
        for count, p in enumerate(idxs):
            right_sum = total - left_sum - p
            right_count = len(idxs) - count - 1
            out[p] = count * p - left_sum + right_sum - right_count * p
            left_sum += p
    return out
