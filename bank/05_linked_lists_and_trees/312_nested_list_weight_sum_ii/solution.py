def depth_sum_inverse(nested_list: list) -> int:
    def max_depth(items: list, depth: int) -> int:
        best = 0
        for item in items:
            if isinstance(item, int):
                best = max(best, depth)
            else:
                best = max(best, max_depth(item, depth + 1))
        return best

    deepest = max_depth(nested_list, 1)

    def weighted(items: list, depth: int) -> int:
        total = 0
        for item in items:
            if isinstance(item, int):
                total += item * (deepest - depth + 1)
            else:
                total += weighted(item, depth + 1)
        return total

    return weighted(nested_list, 1)
