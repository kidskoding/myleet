def min_cost(start_pos: list[int], home_pos: list[int], row_costs: list[int], col_costs: list[int]) -> int:
    (sr, sc), (hr, hc) = start_pos, home_pos
    rows = range(sr + 1, hr + 1) if hr >= sr else range(hr, sr)
    cols = range(sc + 1, hc + 1) if hc >= sc else range(hc, sc)
    return sum(row_costs[r] for r in rows) + sum(col_costs[c] for c in cols)
