def stone_game(piles: list[int]) -> bool:
    # Time: O(n^2).
    # Space: O(n).
    n = len(piles)
    dp = piles[:]
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            dp[i] = max(piles[i] - dp[i + 1], piles[j] - dp[i])
    return dp[0] > 0
