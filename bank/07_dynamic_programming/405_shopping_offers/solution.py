from functools import cache


def shopping_offers(price: list[int], special: list[list[int]], needs: list[int]) -> int:
    # Time: O(s * n * product(needs)) states times offers.
    # Space: O(product(needs)) for the memo.
    n = len(price)

    @cache
    def dfs(rem: tuple[int, ...]) -> int:
        best = sum(p * r for p, r in zip(price, rem))
        for offer in special:
            nxt = tuple(rem[i] - offer[i] for i in range(n))
            if min(nxt) >= 0:
                best = min(best, offer[n] + dfs(nxt))
        return best

    return dfs(tuple(needs))
