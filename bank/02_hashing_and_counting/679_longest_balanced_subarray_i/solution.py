def longest_balanced(nums: list[int]) -> int:
    best = 0
    for left in range(len(nums)):
        evens: set[int] = set()
        odds: set[int] = set()
        for right in range(left, len(nums)):
            (odds if nums[right] % 2 else evens).add(nums[right])
            if len(evens) == len(odds):
                best = max(best, right - left + 1)
    return best
