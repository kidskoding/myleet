def max_area(mat: list[list[int]]) -> int:
    m, n = len(mat), len(mat[0])
    sq = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m):
        for j in range(n):
            if mat[i][j]:
                sq[i + 1][j + 1] = 1 + min(sq[i][j], sq[i][j + 1], sq[i + 1][j])

    def feasible(k: int) -> bool:
        min_r = min_c = float("inf")
        max_r = max_c = -1
        for i in range(m):
            for j in range(n):
                if sq[i + 1][j + 1] >= k:
                    min_r = min(min_r, i)
                    max_r = max(max_r, i)
                    min_c = min(min_c, j)
                    max_c = max(max_c, j)
        return max_r >= 0 and (max_r - min_r >= k or max_c - min_c >= k)

    lo, hi = 0, min(m, n)
    while lo < hi:
        mid = (lo + hi + 1) // 2
        if feasible(mid):
            lo = mid
        else:
            hi = mid - 1
    return lo * lo
