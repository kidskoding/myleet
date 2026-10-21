def path_sum(nums: list[int]) -> int:
    mp = {num // 10: num % 10 for num in nums}
    ans = 0

    def dfs(node: int, total: int) -> None:
        nonlocal ans
        if node not in mp:
            return
        total += mp[node]
        d, p = divmod(node, 10)
        left = (d + 1) * 10 + (p * 2) - 1
        right = left + 1
        if left not in mp and right not in mp:
            ans += total
            return
        dfs(left, total)
        dfs(right, total)

    dfs(11, 0)
    return ans
