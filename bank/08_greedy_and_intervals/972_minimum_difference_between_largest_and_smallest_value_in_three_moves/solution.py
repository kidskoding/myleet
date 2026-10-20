def min_difference(nums: list[int]) -> int:
    n = len(nums)
    if n <= 4:
        return 0
    a = sorted(nums)
    return min(a[n - 4 + i] - a[i] for i in range(4))
