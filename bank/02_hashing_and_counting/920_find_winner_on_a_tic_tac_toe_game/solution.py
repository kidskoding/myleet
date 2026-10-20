def tictactoe(moves: list[list[int]]) -> str:
    rows = [0] * 3
    cols = [0] * 3
    diag = anti = 0
    for turn, (r, c) in enumerate(moves):
        sign = 1 if turn % 2 == 0 else -1
        rows[r] += sign
        cols[c] += sign
        if r == c:
            diag += sign
        if r + c == 2:
            anti += sign
        if 3 in (abs(rows[r]), abs(cols[c]), abs(diag), abs(anti)):
            return "A" if sign == 1 else "B"
    return "Draw" if len(moves) == 9 else "Pending"
