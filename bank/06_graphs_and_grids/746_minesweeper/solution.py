from collections import deque


def update_board(board: list[list[str]], click: list[int]) -> list[list[str]]:
    rows, cols = len(board), len(board[0])
    r, c = click
    if board[r][c] == "M":
        board[r][c] = "X"
        return board

    def neighbours(i: int, j: int) -> list[tuple[int, int]]:
        return [
            (i + di, j + dj) for di in (-1, 0, 1) for dj in (-1, 0, 1) if (di or dj) and 0 <= i + di < rows and 0 <= j + dj < cols
        ]

    board[r][c] = "B"
    queue = deque([(r, c)])
    while queue:
        i, j = queue.popleft()
        around = neighbours(i, j)
        mines = sum(board[x][y] == "M" for x, y in around)
        if mines:
            board[i][j] = str(mines)
            continue
        for x, y in around:
            if board[x][y] == "E":
                board[x][y] = "B"
                queue.append((x, y))
    return board
