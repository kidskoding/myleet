def max_distance(colors: list[int]) -> int:
    n = len(colors)
    best = 0
    for j in range(n - 1, -1, -1):
        if colors[j] != colors[0]:
            best = j
            break
    for i in range(n):
        if colors[i] != colors[-1]:
            best = max(best, n - 1 - i)
            break
    return best
