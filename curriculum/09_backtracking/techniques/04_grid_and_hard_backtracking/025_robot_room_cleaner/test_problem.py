from solution import clean_room


class _GridRobot:
    """Concrete stand-in for the Robot interface the problem hands you.

    The robot only knows "did the move succeed"; its absolute position stays
    hidden from the solution, exactly as on the real judge.
    """

    DIRECTIONS = [(-1, 0), (0, 1), (1, 0), (0, -1)]

    def __init__(self, grid: list[list[int]], row: int, col: int) -> None:
        self.grid = grid
        self.row = row
        self.col = col
        self.facing = 0
        self.cleaned: set[tuple[int, int]] = set()

    def move(self) -> bool:
        row_step, col_step = self.DIRECTIONS[self.facing]
        next_row, next_col = self.row + row_step, self.col + col_step
        in_bounds = 0 <= next_row < len(self.grid) and 0 <= next_col < len(self.grid[0])
        if in_bounds and self.grid[next_row][next_col] == 1:
            self.row, self.col = next_row, next_col
            return True
        return False

    def turn_left(self) -> None:
        self.facing = (self.facing - 1) % 4

    def turn_right(self) -> None:
        self.facing = (self.facing + 1) % 4

    def clean(self) -> None:
        self.cleaned.add((self.row, self.col))


def test_clean_room_cleans_every_reachable_cell():
    grid = [
        [1, 1, 1, 1, 1, 0, 1, 1],
        [1, 1, 1, 1, 1, 0, 1, 1],
        [1, 0, 1, 1, 1, 1, 1, 1],
        [0, 0, 0, 1, 0, 0, 0, 0],
        [1, 1, 1, 1, 1, 1, 1, 1],
    ]
    robot = _GridRobot(grid, 1, 3)
    clean_room(robot)

    assert len(robot.cleaned) == 30


def test_clean_room_small_room():
    robot = _GridRobot([[1, 1], [1, 1]], 0, 0)
    clean_room(robot)

    assert robot.cleaned == {(0, 0), (0, 1), (1, 0), (1, 1)}
