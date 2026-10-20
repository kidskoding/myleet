from bisect import bisect_left, bisect_right

MOD = 10**9 + 7


def ways_to_split(nums: list[int]) -> int:
    n = len(nums)
    prefix = [0] * (n + 1)
    for i, value in enumerate(nums):
        prefix[i + 1] = prefix[i] + value
    total = prefix[n]
    ways = 0
    for i in range(1, n - 1):
        left = prefix[i]
        lo = max(i + 1, bisect_left(prefix, 2 * left))
        hi = min(n - 1, bisect_right(prefix, (total + left) // 2) - 1)
        if hi >= lo:
            ways += hi - lo + 1
    return ways % MOD
