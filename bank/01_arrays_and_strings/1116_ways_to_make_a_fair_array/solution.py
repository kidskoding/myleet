def ways_to_make_fair(nums: list[int]) -> int:
    total_even = sum(nums[0::2])
    total_odd = sum(nums[1::2])
    even_before = odd_before = 0
    ways = 0
    for i, value in enumerate(nums):
        even_after = total_even - even_before - (value if i % 2 == 0 else 0)
        odd_after = total_odd - odd_before - (value if i % 2 == 1 else 0)
        if even_before + odd_after == odd_before + even_after:
            ways += 1
        if i % 2 == 0:
            even_before += value
        else:
            odd_before += value
    return ways
