from functools import cache


def minimum_lines(points: list[list[int]]) -> int:
    n = len(points)
    full = (1 << n) - 1
    line_masks = [[0] * n for _ in range(n)]
    for i in range(n):
        x1, y1 = points[i]
        for j in range(i + 1, n):
            x2, y2 = points[j]
            mask = 0
            for t, (x, y) in enumerate(points):
                if (x2 - x1) * (y - y1) == (y2 - y1) * (x - x1):
                    mask |= 1 << t
            line_masks[i][j] = mask

    @cache
    def solve(covered: int) -> int:
        if covered == full:
            return 0
        i = next(t for t in range(n) if not covered >> t & 1)
        best = 1 + solve(covered | 1 << i)
        for j in range(i + 1, n):
            if not covered >> j & 1:
                best = min(best, 1 + solve(covered | line_masks[i][j]))
        return best

    return solve(0)
