from collections import Counter


def grid_illumination(n: int, lamps: list[list[int]], queries: list[list[int]]) -> list[int]:
    on: set[tuple[int, int]] = set()
    rows: Counter[int] = Counter()
    cols: Counter[int] = Counter()
    diag: Counter[int] = Counter()
    anti: Counter[int] = Counter()
    for r, c in lamps:
        if (r, c) in on:
            continue
        on.add((r, c))
        rows[r] += 1
        cols[c] += 1
        diag[r - c] += 1
        anti[r + c] += 1
    answer = []
    for r, c in queries:
        lit = rows[r] > 0 or cols[c] > 0 or diag[r - c] > 0 or anti[r + c] > 0
        answer.append(1 if lit else 0)
        for nr in range(r - 1, r + 2):
            for nc in range(c - 1, c + 2):
                if (nr, nc) in on:
                    on.remove((nr, nc))
                    rows[nr] -= 1
                    cols[nc] -= 1
                    diag[nr - nc] -= 1
                    anti[nr + nc] -= 1
    return answer
