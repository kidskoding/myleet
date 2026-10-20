from bisect import bisect_left


def minimum_difference(nums: list[int]) -> int:
    n = len(nums) // 2
    total = sum(nums)

    def sums_by_size(part: list[int]) -> list[list[int]]:
        groups: list[list[int]] = [[] for _ in range(n + 1)]
        for mask in range(1 << n):
            size = 0
            s = 0
            for i in range(n):
                if mask >> i & 1:
                    size += 1
                    s += part[i]
            groups[size].append(s)
        return groups

    left = sums_by_size(nums[:n])
    right = [sorted(g) for g in sums_by_size(nums[n:])]
    best = sum(abs(x) for x in nums)
    for size in range(n + 1):
        options = right[n - size]
        for s in left[size]:
            idx = bisect_left(options, (total - 2 * s) / 2)
            for j in (idx - 1, idx):
                if 0 <= j < len(options):
                    best = min(best, abs(total - 2 * (s + options[j])))
    return best
