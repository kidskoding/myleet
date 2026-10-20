def min_moves(target: int, max_doubles: int) -> int:
    moves = 0
    while target > 1 and max_doubles > 0:
        if target % 2:
            target -= 1
        else:
            target //= 2
            max_doubles -= 1
        moves += 1
    return moves + target - 1
