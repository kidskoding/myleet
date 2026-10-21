def num_music_playlists(n: int, goal: int, k: int) -> int:
    mod = 10**9 + 7
    dp = [0] * (n + 1)
    dp[0] = 1
    for _ in range(goal):
        nxt = [0] * (n + 1)
        for j in range(1, n + 1):
            nxt[j] = dp[j - 1] * (n - j + 1) % mod
            if j > k:
                nxt[j] = (nxt[j] + dp[j] * (j - k)) % mod
        dp = nxt
    return dp[n]
