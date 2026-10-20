def max_profit(prices: list[int], profits: list[int]) -> int:
    ranks = {p: i + 1 for i, p in enumerate(sorted(set(prices)))}
    m = len(ranks)
    n = len(prices)

    def update(tree: list[int], i: int, value: int) -> None:
        while i <= m:
            tree[i] = max(tree[i], value)
            i += i & -i

    def query(tree: list[int], i: int) -> int:
        result = 0
        while i > 0:
            result = max(result, tree[i])
            i -= i & -i
        return result

    left = [0] * n
    tree = [0] * (m + 1)
    for j in range(n):
        left[j] = query(tree, ranks[prices[j]] - 1)
        update(tree, ranks[prices[j]], profits[j])

    best = -1
    tree = [0] * (m + 1)
    for j in range(n - 1, -1, -1):
        flipped = m + 1 - ranks[prices[j]]
        right = query(tree, flipped - 1)
        if left[j] and right:
            best = max(best, left[j] + profits[j] + right)
        update(tree, flipped, profits[j])
    return best
