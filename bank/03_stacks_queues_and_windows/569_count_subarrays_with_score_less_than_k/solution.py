def count_subarrays(nums: list[int], k: int) -> int:
    left = 0
    window = 0
    total = 0
    for right, x in enumerate(nums):
        window += x
        while window * (right - left + 1) >= k:
            window -= nums[left]
            left += 1
        total += right - left + 1
    return total
