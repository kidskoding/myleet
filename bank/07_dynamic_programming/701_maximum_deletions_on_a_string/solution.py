def delete_string(s: str) -> int:
    n = len(s)
    dp = [1] * (n + 1)
    next_lcp = [0] * (n + 1)
    for i in range(n - 1, -1, -1):
        lcp = [0] * (n + 1)
        for j in range(n - 1, i, -1):
            if s[i] == s[j]:
                lcp[j] = next_lcp[j + 1] + 1
        for length in range(1, (n - i) // 2 + 1):
            if lcp[i + length] >= length:
                dp[i] = max(dp[i], dp[i + length] + 1)
        next_lcp = lcp
    return dp[0]
