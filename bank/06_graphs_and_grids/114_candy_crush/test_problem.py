from solution import candy_crush


def test_candy_crush_stable_board_unchanged():
    board = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
    assert candy_crush([row[:] for row in board]) == board


def test_candy_crush_horizontal_run_top_row():
    assert candy_crush([[1, 1, 1], [2, 3, 4], [5, 6, 7]]) == [[0, 0, 0], [2, 3, 4], [5, 6, 7]]


def test_candy_crush_vertical_run():
    board = [[5, 1, 9], [2, 1, 8], [3, 1, 7], [4, 6, 6]]
    assert candy_crush(board) == [[5, 0, 9], [2, 0, 8], [3, 0, 7], [4, 6, 6]]


def test_candy_crush_overlapping_row_and_column():
    board = [[1, 1, 1], [1, 2, 3], [1, 4, 5]]
    assert candy_crush(board) == [[0, 0, 0], [0, 2, 3], [0, 4, 5]]


def test_candy_crush_gravity_creates_new_run():
    board = [[3, 1, 4], [2, 2, 2], [3, 5, 6], [3, 7, 8]]
    assert candy_crush(board) == [[0, 0, 0], [0, 1, 4], [0, 5, 6], [0, 7, 8]]


def test_candy_crush_drops_candies_into_gap():
    board = [[1, 2, 3], [4, 4, 4], [5, 6, 7]]
    assert candy_crush(board) == [[0, 0, 0], [1, 2, 3], [5, 6, 7]]
