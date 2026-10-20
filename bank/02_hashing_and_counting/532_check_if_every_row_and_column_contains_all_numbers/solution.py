def check_valid(matrix: list[list[int]]) -> bool:
    want = set(range(1, len(matrix) + 1))
    return all(set(row) == want for row in matrix) and all(set(col) == want for col in zip(*matrix))
