from functools import cache

DIRECTIONS = ((1, 1), (1, -1), (-1, -1), (-1, 1))


def len_of_v_diagonal(grid: list[list[int]]) -> int:
    m, n = len(grid), len(grid[0])

    @cache
    def extend(r: int, c: int, d: int, can_turn: bool, want: int) -> int:
        best = 0
        options = [(d, can_turn)]
        if can_turn:
            options.append(((d + 1) % 4, False))
        for nd, turn in options:
            nr, nc = r + DIRECTIONS[nd][0], c + DIRECTIONS[nd][1]
            if 0 <= nr < m and 0 <= nc < n and grid[nr][nc] == want:
                best = max(best, 1 + extend(nr, nc, nd, turn, 2 - want))
        return best

    answer = 0
    for r in range(m):
        for c in range(n):
            if grid[r][c] == 1:
                answer = max(answer, 1)
                for d in range(4):
                    nr, nc = r + DIRECTIONS[d][0], c + DIRECTIONS[d][1]
                    if 0 <= nr < m and 0 <= nc < n and grid[nr][nc] == 2:
                        answer = max(answer, 2 + extend(nr, nc, d, True, 0))
    extend.cache_clear()
    return answer
