def lucky_numbers(matrix: list[list[int]]) -> list[int]:
    row_mins = {min(row) for row in matrix}
    col_maxes = {max(col) for col in zip(*matrix)}
    return sorted(row_mins & col_maxes)
