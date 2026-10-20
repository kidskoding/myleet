def first_complete_index(arr: list[int], mat: list[list[int]]) -> int:
    m, n = len(mat), len(mat[0])
    where = {mat[r][c]: (r, c) for r in range(m) for c in range(n)}
    row_count = [0] * m
    col_count = [0] * n
    for i, value in enumerate(arr):
        r, c = where[value]
        row_count[r] += 1
        col_count[c] += 1
        if row_count[r] == n or col_count[c] == m:
            return i
    return -1
