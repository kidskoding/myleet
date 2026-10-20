def champagne_tower(poured: int, query_row: int, query_glass: int) -> float:
    row = [float(poured)]
    for _ in range(query_row):
        nxt = [0.0] * (len(row) + 1)
        for i, amount in enumerate(row):
            extra = (amount - 1) / 2
            if extra > 0:
                nxt[i] += extra
                nxt[i + 1] += extra
        row = nxt
    return min(1.0, row[query_glass])
