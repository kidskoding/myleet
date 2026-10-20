def matrix_reshape(mat: list[list[int]], r: int, c: int) -> list[list[int]]:
    m, n = len(mat), len(mat[0])
    if m * n != r * c:
        return mat
    flat = [value for row in mat for value in row]
    return [flat[i * c : (i + 1) * c] for i in range(r)]
