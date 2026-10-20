def binary_searchable_numbers(nums: list[int]) -> int:
    n = len(nums)
    suffix_min = [float("inf")] * (n + 1)
    for i in range(n - 1, -1, -1):
        suffix_min[i] = min(suffix_min[i + 1], nums[i])
    count = 0
    prefix_max = float("-inf")
    for i, value in enumerate(nums):
        if prefix_max < value < suffix_min[i + 1]:
            count += 1
        prefix_max = max(prefix_max, value)
    return count
