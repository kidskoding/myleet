MOD = 10**9 + 7


def sum_of_powers(nums: list[int], k: int) -> int:
    nums = sorted(nums)
    n = len(nums)

    def count_with_min_gap(d: int) -> int:
        reach = []
        p = -1
        for i in range(n):
            while p + 1 < i and nums[i] - nums[p + 1] >= d:
                p += 1
            reach.append(p)
        ways = [1] * n
        for _ in range(k - 1):
            prefix = [0] * (n + 1)
            for i in range(n):
                prefix[i + 1] = (prefix[i] + ways[i]) % MOD
            ways = [prefix[reach[i] + 1] for i in range(n)]
        return sum(ways) % MOD

    gaps = sorted({b - a for i, a in enumerate(nums) for b in nums[i + 1 :] if b > a})
    total = 0
    previous = 0
    for d in gaps:
        total = (total + (d - previous) * count_with_min_gap(d)) % MOD
        previous = d
    return total
