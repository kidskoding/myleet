def modified_matrix(matrix: list[list[int]]) -> list[list[int]]:
    col_max = [max(col) for col in zip(*matrix)]
    return [[col_max[j] if v == -1 else v for j, v in enumerate(row)] for row in matrix]
