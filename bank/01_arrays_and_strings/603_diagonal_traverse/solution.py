def find_diagonal_order(mat: list[list[int]]) -> list[int]:
    m, n = len(mat), len(mat[0])
    out: list[int] = []
    for d in range(m + n - 1):
        diagonal = [mat[r][d - r] for r in range(max(0, d - n + 1), min(m, d + 1))]
        out.extend(reversed(diagonal) if d % 2 == 0 else diagonal)
    return out
