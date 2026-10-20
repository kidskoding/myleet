from collections import Counter


def min_cost(nums1: list[int], nums2: list[int]) -> int:
    first = Counter(nums1)
    total = first + Counter(nums2)
    if any(c % 2 for c in total.values()):
        return -1
    return sum(max(0, first[v] - c // 2) for v, c in total.items())
