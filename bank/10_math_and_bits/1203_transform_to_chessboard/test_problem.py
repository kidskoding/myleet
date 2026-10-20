from solution import moves_to_chessboard


def test_moves_to_chessboard_two_swaps():
    board = [[0, 1, 1, 0], [0, 1, 1, 0], [1, 0, 0, 1], [1, 0, 0, 1]]
    assert moves_to_chessboard(board) == 2


def test_moves_to_chessboard_already_chessboard():
    assert moves_to_chessboard([[0, 1], [1, 0]]) == 0


def test_moves_to_chessboard_impossible_rows():
    assert moves_to_chessboard([[1, 0], [1, 0]]) == -1


def test_moves_to_chessboard_single_cell():
    assert moves_to_chessboard([[1]]) == 0


def test_moves_to_chessboard_odd_size():
    assert moves_to_chessboard([[1, 1, 0], [0, 0, 1], [0, 0, 1]]) == 2


def test_moves_to_chessboard_unbalanced_counts():
    assert moves_to_chessboard([[1, 1, 1], [1, 1, 1], [0, 0, 0]]) == -1
