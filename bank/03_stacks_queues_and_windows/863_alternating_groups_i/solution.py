def number_of_alternating_groups(colors: list[int]) -> int:
    n = len(colors)
    count = 0
    for i in range(n):
        if colors[i] != colors[i - 1] and colors[i] != colors[(i + 1) % n]:
            count += 1
    return count
