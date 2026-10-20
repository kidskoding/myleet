def generate(num_rows: int) -> list[list[int]]:
    rows = [[1]]
    for _ in range(num_rows - 1):
        prev = rows[-1]
        rows.append([1] + [prev[i] + prev[i + 1] for i in range(len(prev) - 1)] + [1])
    return rows
