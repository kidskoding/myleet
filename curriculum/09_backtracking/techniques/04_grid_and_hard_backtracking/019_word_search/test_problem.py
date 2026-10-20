from solution import exist


def test_exist_single_cell_match():
    assert exist([["A"]], "A") is True


def test_exist_normal_found():
    board = [["A", "B", "C", "E"], ["S", "F", "C", "S"], ["A", "D", "E", "E"]]
    assert exist(board, "ABCCED") is True


def test_exist_not_found():
    board = [["A", "B", "C", "E"], ["S", "F", "C", "S"], ["A", "D", "E", "E"]]
    assert exist(board, "ABCB") is False
