def winner_square_game(n: int) -> bool:
    win = [False] * (n + 1)
    for i in range(1, n + 1):
        s = 1
        while s * s <= i:
            if not win[i - s * s]:
                win[i] = True
                break
            s += 1
    return win[n]
