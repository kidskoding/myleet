from solution import tictactoe


def test_tictactoe_a_wins_diagonal():
    assert tictactoe([[0, 0], [2, 0], [1, 1], [2, 1], [2, 2]]) == "A"


def test_tictactoe_b_wins_anti_diagonal():
    assert tictactoe([[0, 0], [1, 1], [0, 1], [0, 2], [1, 0], [2, 0]]) == "B"


def test_tictactoe_draw():
    assert tictactoe([[0, 0], [1, 1], [2, 0], [1, 0], [1, 2], [2, 1], [0, 1], [0, 2], [2, 2]]) == "Draw"


def test_tictactoe_pending():
    assert tictactoe([[0, 0], [1, 1]]) == "Pending"


def test_tictactoe_single_move():
    assert tictactoe([[1, 1]]) == "Pending"


def test_tictactoe_a_wins_on_last_square():
    assert tictactoe([[0, 0], [0, 1], [1, 2], [0, 2], [2, 1], [1, 0], [2, 2], [2, 0], [1, 1]]) == "A"


def test_tictactoe_b_wins_column():
    assert tictactoe([[0, 0], [0, 1], [2, 2], [1, 1], [1, 0], [2, 1]]) == "B"
