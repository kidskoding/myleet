def transpose(matrix: list[list[int]]) -> list[list[int]]:
    rows, cols = len(matrix), len(matrix[0])
    return [[matrix[i][j] for i in range(rows)] for j in range(cols)]
