def convert(s: str, num_rows: int) -> str:
    # Time: O(n).
    # Space: O(n).
    if num_rows == 1 or num_rows >= len(s):
        return s
    rows: list[list[str]] = [[] for _ in range(num_rows)]
    row, step = 0, 1
    for ch in s:
        rows[row].append(ch)
        if row == 0:
            step = 1
        elif row == num_rows - 1:
            step = -1
        row += step
    return "".join("".join(r) for r in rows)
