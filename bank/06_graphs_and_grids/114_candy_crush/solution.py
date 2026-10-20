def candy_crush(board: list[list[int]]) -> list[list[int]]:
    rows, cols = len(board), len(board[0])
    while True:
        crush: set[tuple[int, int]] = set()
        for r in range(rows):
            for c in range(cols - 2):
                v = board[r][c]
                if v and v == board[r][c + 1] == board[r][c + 2]:
                    crush.update({(r, c), (r, c + 1), (r, c + 2)})
        for r in range(rows - 2):
            for c in range(cols):
                v = board[r][c]
                if v and v == board[r + 1][c] == board[r + 2][c]:
                    crush.update({(r, c), (r + 1, c), (r + 2, c)})
        if not crush:
            return board
        for r, c in crush:
            board[r][c] = 0
        for c in range(cols):
            write = rows - 1
            for r in range(rows - 1, -1, -1):
                if board[r][c]:
                    board[write][c] = board[r][c]
                    write -= 1
            for r in range(write, -1, -1):
                board[r][c] = 0
