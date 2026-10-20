def best_team_score(scores: list[int], ages: list[int]) -> int:
    players = sorted(zip(ages, scores))
    best = [0] * len(players)
    for i, (_, score) in enumerate(players):
        best[i] = score
        for j in range(i):
            if players[j][1] <= score:
                best[i] = max(best[i], best[j] + score)
    return max(best)
