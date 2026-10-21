from collections import defaultdict


def count_complete_subarrays(nums: list[int]) -> int:
    target = len(set(nums))
    freq: dict[int, int] = defaultdict(int)
    ans = left = 0
    for right, value in enumerate(nums):
        freq[value] += 1
        while len(freq) == target:
            ans += len(nums) - right
            freq[nums[left]] -= 1
            if freq[nums[left]] == 0:
                del freq[nums[left]]
            left += 1
    return ans
