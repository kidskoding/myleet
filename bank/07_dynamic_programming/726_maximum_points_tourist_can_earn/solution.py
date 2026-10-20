def max_score(n: int, k: int, stay_score: list[list[int]], travel_score: list[list[int]]) -> int:
    best = [0] * n
    for day in range(k):
        nxt = []
        for dest in range(n):
            value = best[dest] + stay_score[day][dest]
            for cur in range(n):
                if cur != dest:
                    value = max(value, best[cur] + travel_score[cur][dest])
            nxt.append(value)
        best = nxt
    return max(best)
