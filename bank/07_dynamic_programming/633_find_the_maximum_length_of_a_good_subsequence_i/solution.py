def maximum_length(nums: list[int], k: int) -> int:
    n = len(nums)
    dp = [[0] * (k + 1) for _ in range(n)]
    best = 0
    for i in range(n):
        for j in range(k + 1):
            length = 1
            for p in range(i):
                if nums[p] == nums[i]:
                    length = max(length, dp[p][j] + 1)
                elif j > 0:
                    length = max(length, dp[p][j - 1] + 1)
            dp[i][j] = length
            best = max(best, length)
    return best
