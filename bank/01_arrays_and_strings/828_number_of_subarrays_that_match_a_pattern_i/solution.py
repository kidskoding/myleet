def count_matching_subarrays(nums: list[int], pattern: list[int]) -> int:
    signs = [(b > a) - (b < a) for a, b in zip(nums, nums[1:])]
    m = len(pattern)
    return sum(1 for i in range(len(signs) - m + 1) if signs[i : i + m] == pattern)
