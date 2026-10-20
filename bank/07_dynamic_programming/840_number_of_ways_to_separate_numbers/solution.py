MOD = 10**9 + 7


def number_of_combinations(num: str) -> int:
    n = len(num)
    lcp = [[0] * (n + 1) for _ in range(n + 1)]
    for i in range(n - 1, -1, -1):
        for j in range(n - 1, -1, -1):
            if num[i] == num[j]:
                lcp[i][j] = lcp[i + 1][j + 1] + 1
    prefix = [[0] * (n + 1) for _ in range(n + 1)]
    for end in range(1, n + 1):
        for length in range(1, end + 1):
            start = end - length
            ways = 0
            if num[start] != "0":
                if start == 0:
                    ways = 1
                else:
                    ways = prefix[start][min(length - 1, start)]
                    if length <= start:
                        k = lcp[start - length][start]
                        if k >= length or num[start - length + k] < num[start + k]:
                            ways += prefix[start][length] - prefix[start][length - 1]
            prefix[end][length] = (prefix[end][length - 1] + ways) % MOD
    return prefix[n][n] % MOD
