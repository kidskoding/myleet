def matrix_sum_queries(n: int, queries: list[list[int]]) -> int:
    seen_row: set[int] = set()
    seen_col: set[int] = set()
    ans = 0
    for t, i, v in reversed(queries):
        if t == 0:
            if i not in seen_row:
                ans += v * (n - len(seen_col))
                seen_row.add(i)
        else:
            if i not in seen_col:
                ans += v * (n - len(seen_row))
                seen_col.add(i)
    return ans
