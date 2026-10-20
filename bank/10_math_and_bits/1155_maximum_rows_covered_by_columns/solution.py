def maximum_rows(matrix: list[list[int]], num_select: int) -> int:
    cols = len(matrix[0])
    rows = [sum(bit << c for c, bit in enumerate(row)) for row in matrix]
    best = 0
    for chosen in range(1 << cols):
        if chosen.bit_count() == num_select:
            best = max(best, sum(1 for row in rows if row & ~chosen == 0))
    return best
