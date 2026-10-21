def sum_of_squares(nums: list[int]) -> int:
    n = len(nums)
    return sum(nums[i] * nums[i] for i in range(n) if n % (i + 1) == 0)
