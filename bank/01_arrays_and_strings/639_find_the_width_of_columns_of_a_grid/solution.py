def find_column_width(grid: list[list[int]]) -> list[int]:
    return [max(len(str(v)) for v in col) for col in zip(*grid)]
