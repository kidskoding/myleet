def number_of_alternating_groups(colors: list[int], k: int) -> int:
    n = len(colors)
    groups = 0
    run = 1
    for i in range(1, n + k - 1):
        if colors[i % n] != colors[(i - 1) % n]:
            run += 1
        else:
            run = 1
        if run >= k:
            groups += 1
    return groups
