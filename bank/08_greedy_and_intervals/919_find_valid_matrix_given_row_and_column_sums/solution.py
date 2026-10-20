def restore_matrix(row_sum: list[int], col_sum: list[int]) -> list[list[int]]:
    rows = list(row_sum)
    cols = list(col_sum)
    matrix = [[0] * len(cols) for _ in rows]
    i = j = 0
    while i < len(rows) and j < len(cols):
        value = min(rows[i], cols[j])
        matrix[i][j] = value
        rows[i] -= value
        cols[j] -= value
        if rows[i] == 0:
            i += 1
        else:
            j += 1
    return matrix
