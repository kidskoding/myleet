def house_of_cards(n: int) -> int:
    ways = [0] * (n + 1)
    ways[0] = 1
    row = 2
    while row <= n:
        for total in range(n, row - 1, -1):
            ways[total] += ways[total - row]
        row += 3
    return ways[n]
