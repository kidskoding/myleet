def min_moves_to_make_palindrome(s: str) -> int:
    chars = list(s)
    moves = 0
    while len(chars) > 1:
        j = len(chars) - 1 - chars[::-1].index(chars[0])
        if j == 0:
            moves += len(chars) // 2
            chars.pop(0)
        else:
            moves += len(chars) - 1 - j
            chars.pop(j)
            chars.pop(0)
    return moves
