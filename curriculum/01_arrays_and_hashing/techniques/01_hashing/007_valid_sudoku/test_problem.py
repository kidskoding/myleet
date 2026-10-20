from solution import is_valid_sudoku


def _valid_board() -> list[list[str]]:
    return [
        ["5", "3", ".", ".", "7", ".", ".", ".", "."],
        ["6", ".", ".", "1", "9", "5", ".", ".", "."],
        [".", "9", "8", ".", ".", ".", ".", "6", "."],
        ["8", ".", ".", ".", "6", ".", ".", ".", "3"],
        ["4", ".", ".", "8", ".", "3", ".", ".", "1"],
        ["7", ".", ".", ".", "2", ".", ".", ".", "6"],
        [".", "6", ".", ".", ".", ".", "2", "8", "."],
        [".", ".", ".", "4", "1", "9", ".", ".", "5"],
        [".", ".", ".", ".", "8", ".", ".", "7", "9"],
    ]


def _invalid_board() -> list[list[str]]:
    board = _valid_board()
    board[0][0] = "8"
    return board


def test_is_valid_sudoku_true():
    assert is_valid_sudoku(_valid_board()) is True


def test_is_valid_sudoku_false_duplicate_in_column():
    assert is_valid_sudoku(_invalid_board()) is False


def _sparse_board() -> list[list[str]]:
    return [["." for _ in range(9)] for _ in range(9)]


def test_is_valid_sudoku_false_duplicate_only_in_box():
    """Rows and columns are clean; only the top-left 3x3 box repeats.

    A solution that checks rows and columns but forgets the boxes passes every
    other test in this file, so this is the one that catches it.
    """
    board = _sparse_board()
    board[0][0] = "5"
    board[1][1] = "5"

    assert is_valid_sudoku(board) is False


def test_is_valid_sudoku_false_duplicate_only_in_row():
    board = _sparse_board()
    board[3][0] = "7"
    board[3][8] = "7"

    assert is_valid_sudoku(board) is False


def test_is_valid_sudoku_same_value_in_different_boxes_is_fine():
    board = _sparse_board()
    board[0][0] = "5"
    board[4][4] = "5"
    board[8][8] = "5"

    assert is_valid_sudoku(board) is True


def test_is_valid_sudoku_empty_board():
    assert is_valid_sudoku(_sparse_board()) is True
