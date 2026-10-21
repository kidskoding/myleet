def number_of_ways(
    n: int, m: int, k: int, source: list[int], dest: list[int]
) -> int:
    mod = 10**9 + 7
    same, same_col, same_row, other = 1, 0, 0, 0
    for _ in range(k):
        nxt_same = ((n - 1) * same_col + (m - 1) * same_row) % mod
        nxt_col = (same + (n - 2) * same_col + (m - 1) * other) % mod
        nxt_row = (same + (m - 2) * same_row + (n - 1) * other) % mod
        nxt_other = (same_col + same_row + (n - 2) * other + (m - 2) * other) % mod
        same, same_col, same_row, other = nxt_same, nxt_col, nxt_row, nxt_other
    if source[0] == dest[0]:
        return same if source[1] == dest[1] else same_row
    return same_col if source[1] == dest[1] else other
