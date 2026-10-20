def moves_to_chessboard(board: list[list[int]]) -> int:
    n = len(board)
    for i in range(n):
        for j in range(n):
            if board[0][0] ^ board[i][0] ^ board[0][j] ^ board[i][j]:
                return -1
    row_ones = sum(board[0])
    col_ones = sum(board[i][0] for i in range(n))
    if not n // 2 <= row_ones <= (n + 1) // 2:
        return -1
    if not n // 2 <= col_ones <= (n + 1) // 2:
        return -1
    row_miss = sum(board[0][i] == i % 2 for i in range(n))
    col_miss = sum(board[i][0] == i % 2 for i in range(n))
    if n % 2:
        if row_miss % 2:
            row_miss = n - row_miss
        if col_miss % 2:
            col_miss = n - col_miss
    else:
        row_miss = min(row_miss, n - row_miss)
        col_miss = min(col_miss, n - col_miss)
    return (row_miss + col_miss) // 2
