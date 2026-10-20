def unhappy_friends(n: int, preferences: list[list[int]], pairs: list[list[int]]) -> int:
    rank = [[0] * n for _ in range(n)]
    for person, prefs in enumerate(preferences):
        for position, friend in enumerate(prefs):
            rank[person][friend] = position
    partner = [0] * n
    for a, b in pairs:
        partner[a] = b
        partner[b] = a

    unhappy = 0
    for x in range(n):
        y = partner[x]
        for u in preferences[x][: rank[x][y]]:
            if rank[u][x] < rank[u][partner[u]]:
                unhappy += 1
                break
    return unhappy
