def count_subarrays(nums: list[int]) -> int:
    total = 0
    run = 0
    for i, x in enumerate(nums):
        run = run + 1 if i > 0 and x > nums[i - 1] else 1
        total += run
    return total
