class TicTacToe:
    def __init__(self, n: int) -> None:
        self.n = n
        self.rows = [0] * n
        self.cols = [0] * n
        self.diagonal = 0
        self.anti_diagonal = 0

    def move(self, row: int, col: int, player: int) -> int:
        delta = 1 if player == 1 else -1
        self.rows[row] += delta
        self.cols[col] += delta
        if row == col:
            self.diagonal += delta
        if row + col == self.n - 1:
            self.anti_diagonal += delta
        target = delta * self.n
        if target in (self.rows[row], self.cols[col], self.diagonal, self.anti_diagonal):
            return player
        return 0
