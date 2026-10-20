def longest_palindrome(word1: str, word2: str) -> int:
    s = word1 + word2
    n, split = len(s), len(word1)
    dp = [[0] * n for _ in range(n)]
    best = 0
    for i in range(n - 1, -1, -1):
        dp[i][i] = 1
        for j in range(i + 1, n):
            if s[i] == s[j]:
                dp[i][j] = dp[i + 1][j - 1] + 2
                if i < split <= j:
                    best = max(best, dp[i][j])
            else:
                dp[i][j] = max(dp[i + 1][j], dp[i][j - 1])
    return best
