def minimum_substrings_in_partition(s: str) -> int:
    n = len(s)
    dp = [0] + [n] * n
    for i in range(1, n + 1):
        counts = [0] * 26
        distinct = 0
        top = 0
        for j in range(i - 1, -1, -1):
            c = ord(s[j]) - 97
            if counts[c] == 0:
                distinct += 1
            counts[c] += 1
            top = max(top, counts[c])
            if top * distinct == i - j:
                dp[i] = min(dp[i], dp[j] + 1)
    return dp[n]
