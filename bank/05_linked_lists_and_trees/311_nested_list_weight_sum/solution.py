def depth_sum(nested_list: list) -> int:
    def dfs(items: list, depth: int) -> int:
        total = 0
        for item in items:
            if isinstance(item, int):
                total += item * depth
            else:
                total += dfs(item, depth + 1)
        return total

    return dfs(nested_list, 1)
