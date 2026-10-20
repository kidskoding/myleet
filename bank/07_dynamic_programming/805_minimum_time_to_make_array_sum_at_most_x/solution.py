def minimum_time(nums1: list[int], nums2: list[int], x: int) -> int:
    n = len(nums1)
    pairs = sorted(zip(nums2, nums1))
    dp = [0] * (n + 1)
    for i, (grow, base) in enumerate(pairs):
        for j in range(i + 1, 0, -1):
            dp[j] = max(dp[j], dp[j - 1] + base + grow * j)
    s1, s2 = sum(nums1), sum(nums2)
    for t in range(n + 1):
        if s1 + s2 * t - dp[t] <= x:
            return t
    return -1
