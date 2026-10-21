from bisect import bisect_left


def maximize_win(prize_positions: list[int], k: int) -> int:
    n = len(prize_positions)
    best = [0] * (n + 1)
    ans = 0
    for i, x in enumerate(prize_positions, 1):
        j = bisect_left(prize_positions, x - k)
        ans = max(ans, best[j] + i - j)
        best[i] = max(best[i - 1], i - j)
    return ans
