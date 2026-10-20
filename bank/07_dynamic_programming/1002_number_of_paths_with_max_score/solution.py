MOD = 10**9 + 7


def paths_with_max_score(board: list[str]) -> list[int]:
    n = len(board)
    best = [[-1] * (n + 1) for _ in range(n + 1)]
    ways = [[0] * (n + 1) for _ in range(n + 1)]
    best[n - 1][n - 1] = 0
    ways[n - 1][n - 1] = 1
    for r in range(n - 1, -1, -1):
        for c in range(n - 1, -1, -1):
            if (r == n - 1 and c == n - 1) or board[r][c] == "X":
                continue
            top = max(best[r + 1][c], best[r][c + 1], best[r + 1][c + 1])
            if top < 0:
                continue
            count = 0
            for pr, pc in ((r + 1, c), (r, c + 1), (r + 1, c + 1)):
                if best[pr][pc] == top:
                    count += ways[pr][pc]
            value = 0 if board[r][c] == "E" else int(board[r][c])
            best[r][c] = top + value
            ways[r][c] = count % MOD
    if best[0][0] < 0:
        return [0, 0]
    return [best[0][0], ways[0][0]]
