def multiply(mat1: list[list[int]], mat2: list[list[int]]) -> list[list[int]]:
    # Time: O(m * k * n) worst case, far less when sparse.
    # Space: O(k * n) for the compressed rows of mat2.
    m, n = len(mat1), len(mat2[0])
    rows2 = [[(j, v) for j, v in enumerate(row) if v] for row in mat2]
    result = [[0] * n for _ in range(m)]
    for i in range(m):
        for k, a in enumerate(mat1[i]):
            if a:
                for j, b in rows2[k]:
                    result[i][j] += a * b
    return result
