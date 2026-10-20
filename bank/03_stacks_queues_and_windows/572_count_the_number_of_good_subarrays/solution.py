from collections import Counter


def count_good(nums: list[int], k: int) -> int:
    freq: Counter[int] = Counter()
    pairs = 0
    left = 0
    total = 0
    for x in nums:
        pairs += freq[x]
        freq[x] += 1
        while pairs >= k:
            freq[nums[left]] -= 1
            pairs -= freq[nums[left]]
            left += 1
        total += left
    return total
