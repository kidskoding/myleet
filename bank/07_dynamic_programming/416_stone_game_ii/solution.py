from functools import cache


def stone_game_ii(piles: list[int]) -> int:
    # Time: O(n^3).
    # Space: O(n^2).
    n = len(piles)
    suffix = [0] * (n + 1)
    for i in range(n - 1, -1, -1):
        suffix[i] = suffix[i + 1] + piles[i]

    @cache
    def dp(i: int, m: int) -> int:
        if i + 2 * m >= n:
            return suffix[i]
        return suffix[i] - min(dp(i + x, max(m, x)) for x in range(1, 2 * m + 1))

    return dp(0, 1)
