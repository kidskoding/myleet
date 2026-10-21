from functools import cache


def get_max_grid_happiness(
    m: int, n: int, introverts_count: int, extroverts_count: int
) -> int:
    mx = 3**n
    f = [0] * mx
    g = [[0] * mx for _ in range(mx)]
    h = [[0, 0, 0], [0, -60, -10], [0, -10, 40]]
    bits = [[0] * n for _ in range(mx)]
    ix = [0] * mx
    ex = [0] * mx
    for i in range(mx):
        mask = i
        for j in range(n):
            mask, x = divmod(mask, 3)
            bits[i][j] = x
            if x == 1:
                ix[i] += 1
                f[i] += 120
            elif x == 2:
                ex[i] += 1
                f[i] += 40
            if j:
                f[i] += h[x][bits[i][j - 1]]
    for i in range(mx):
        for j in range(mx):
            for k in range(n):
                g[i][j] += h[bits[i][k]][bits[j][k]]

    @cache
    def dfs(i: int, pre: int, ic: int, ec: int) -> int:
        if i == m or (ic == 0 and ec == 0):
            return 0
        ans = 0
        for cur in range(mx):
            if ix[cur] <= ic and ex[cur] <= ec:
                ans = max(
                    ans,
                    f[cur]
                    + g[pre][cur]
                    + dfs(i + 1, cur, ic - ix[cur], ec - ex[cur]),
                )
        return ans

    return dfs(0, 0, introverts_count, extroverts_count)
