ROOK = [(1, 0), (-1, 0), (0, 1), (0, -1)]
BISHOP = [(1, 1), (1, -1), (-1, 1), (-1, -1)]
DIRECTIONS = {"rook": ROOK, "bishop": BISHOP, "queen": ROOK + BISHOP}


def count_combinations(pieces: list[str], positions: list[list[int]]) -> int:
    options = []
    for piece, (r, c) in zip(pieces, positions):
        moves = [(r, c, 0, 0, 0)]
        for dr, dc in DIRECTIONS[piece]:
            steps = 1
            while 1 <= r + dr * steps <= 8 and 1 <= c + dc * steps <= 8:
                moves.append((r, c, dr, dc, steps))
                steps += 1
        options.append(moves)

    def at(move: tuple[int, int, int, int, int], t: int) -> tuple[int, int]:
        r, c, dr, dc, steps = move
        s = min(t, steps)
        return r + dr * s, c + dc * s

    def clash(a: tuple[int, int, int, int, int], b: tuple[int, int, int, int, int]) -> bool:
        for t in range(1, max(a[4], b[4]) + 1):
            if at(a, t) == at(b, t):
                return True
        return False

    chosen: list[tuple[int, int, int, int, int]] = []

    def backtrack(i: int) -> int:
        if i == len(options):
            return 1
        total = 0
        for move in options[i]:
            if all(not clash(move, other) for other in chosen):
                chosen.append(move)
                total += backtrack(i + 1)
                chosen.pop()
        return total

    return backtrack(0)
