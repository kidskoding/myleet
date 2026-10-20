def max_vacation_days(flights: list[list[int]], days: list[list[int]]) -> int:
    n = len(flights)
    weeks = len(days[0])
    unreachable = -1
    best = [unreachable] * n
    best[0] = 0
    for week in range(weeks):
        nxt = [unreachable] * n
        for src in range(n):
            if best[src] == unreachable:
                continue
            for dst in range(n):
                if dst == src or flights[src][dst] == 1:
                    nxt[dst] = max(nxt[dst], best[src] + days[dst][week])
        best = nxt
    return max(best)
