from functools import cache


def min_cost(nums: list[int]) -> int:
    n = len(nums)

    @cache
    def best(keep: int, start: int) -> int:
        if start == n:
            return nums[keep]
        if start == n - 1:
            return max(nums[keep], nums[start])
        a, b, c = nums[keep], nums[start], nums[start + 1]
        return min(
            max(a, b) + best(start + 1, start + 2),
            max(a, c) + best(start, start + 2),
            max(b, c) + best(keep, start + 2),
        )

    return best(0, 1)
