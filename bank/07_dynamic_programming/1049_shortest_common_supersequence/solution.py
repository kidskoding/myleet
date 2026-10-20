def shortest_common_supersequence(str1: str, str2: str) -> str:
    m, n = len(str1), len(str2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m - 1, -1, -1):
        for j in range(n - 1, -1, -1):
            if str1[i] == str2[j]:
                dp[i][j] = dp[i + 1][j + 1] + 1
            else:
                dp[i][j] = max(dp[i + 1][j], dp[i][j + 1])
    out: list[str] = []
    i = j = 0
    while i < m and j < n:
        if str1[i] == str2[j]:
            out.append(str1[i])
            i += 1
            j += 1
        elif dp[i + 1][j] >= dp[i][j + 1]:
            out.append(str1[i])
            i += 1
        else:
            out.append(str2[j])
            j += 1
    out.append(str1[i:])
    out.append(str2[j:])
    return "".join(out)
