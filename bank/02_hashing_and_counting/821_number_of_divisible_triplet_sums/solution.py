from collections import defaultdict


def divisible_triplet_count(nums: list[int], d: int) -> int:
    left: dict[int, int] = defaultdict(int)
    total = 0
    for j in range(len(nums)):
        for k in range(j + 1, len(nums)):
            total += left[(-nums[j] - nums[k]) % d]
        left[nums[j] % d] += 1
    return total
