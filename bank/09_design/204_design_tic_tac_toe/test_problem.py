from solution import TicTacToe


def play(n: int, moves: list[tuple[int, int, int]]) -> list[int]:
    game = TicTacToe(n)
    return [game.move(row, col, player) for row, col, player in moves]


def test_move_row_win_for_player_one():
    moves = [(0, 0, 1), (1, 0, 2), (0, 1, 1), (1, 1, 2), (0, 2, 1)]
    assert play(3, moves) == [0, 0, 0, 0, 1]


def test_move_column_win_for_player_two():
    moves = [(0, 0, 1), (0, 1, 2), (1, 0, 1), (1, 1, 2), (2, 2, 1), (2, 1, 2)]
    assert play(3, moves) == [0, 0, 0, 0, 0, 2]


def test_move_anti_diagonal_win():
    moves = [(0, 2, 2), (0, 0, 1), (1, 1, 2), (1, 0, 1), (2, 0, 2)]
    assert play(3, moves) == [0, 0, 0, 0, 2]


def test_move_single_cell_board():
    assert play(1, [(0, 0, 1)]) == [1]


def test_move_full_board_draw():
    moves = [(0, 0, 1), (0, 1, 2), (0, 2, 1), (1, 1, 2), (1, 0, 1), (1, 2, 2), (2, 1, 1), (2, 0, 2), (2, 2, 1)]
    assert play(3, moves) == [0] * 9
