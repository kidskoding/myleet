from collections import Counter
from functools import cache


def min_cost(nums: list[int], k: int) -> int:
    n = len(nums)

    @cache
    def dfs(i: int) -> int:
        if i >= n:
            return 0
        cnt: Counter[int] = Counter()
        one = 0
        ans = float("inf")
        for j in range(i, n):
            cnt[nums[j]] += 1
            if cnt[nums[j]] == 1:
                one += 1
            elif cnt[nums[j]] == 2:
                one -= 1
            ans = min(ans, k + j - i + 1 - one + dfs(j + 1))
        return int(ans)

    return dfs(0)
