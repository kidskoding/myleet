from solution import update_board


def test_update_board_flood_fill():
    board = [["E", "E", "E", "E", "E"], ["E", "E", "M", "E", "E"], ["E", "E", "E", "E", "E"], ["E", "E", "E", "E", "E"]]
    expected = [["B", "1", "E", "1", "B"], ["B", "1", "M", "1", "B"], ["B", "1", "1", "1", "B"], ["B", "B", "B", "B", "B"]]
    assert update_board(board, [3, 0]) == expected


def test_update_board_click_mine():
    board = [["B", "1", "E", "1", "B"], ["B", "1", "M", "1", "B"], ["B", "1", "1", "1", "B"], ["B", "B", "B", "B", "B"]]
    expected = [["B", "1", "E", "1", "B"], ["B", "1", "X", "1", "B"], ["B", "1", "1", "1", "B"], ["B", "B", "B", "B", "B"]]
    assert update_board(board, [1, 2]) == expected


def test_update_board_single_mine():
    assert update_board([["M"]], [0, 0]) == [["X"]]


def test_update_board_single_empty():
    assert update_board([["E"]], [0, 0]) == [["B"]]


def test_update_board_next_to_mine_shows_count():
    assert update_board([["E", "M"]], [0, 0]) == [["1", "M"]]


def test_update_board_count_two():
    board = [["M", "E", "M"], ["E", "E", "E"]]
    assert update_board(board, [0, 1]) == [["M", "2", "M"], ["E", "E", "E"]]
