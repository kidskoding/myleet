def is_winner(player1: list[int], player2: list[int]) -> int:
    def score(pins: list[int]) -> int:
        total = 0
        for i, x in enumerate(pins):
            doubled = (i >= 1 and pins[i - 1] == 10) or (i >= 2 and pins[i - 2] == 10)
            total += 2 * x if doubled else x
        return total

    a, b = score(player1), score(player2)
    if a > b:
        return 1
    if b > a:
        return 2
    return 0
