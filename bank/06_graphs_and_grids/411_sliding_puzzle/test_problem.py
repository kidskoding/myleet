from solution import sliding_puzzle


def test_sliding_puzzle_one_move():
    assert sliding_puzzle([[1, 2, 3], [4, 0, 5]]) == 1


def test_sliding_puzzle_unsolvable():
    assert sliding_puzzle([[1, 2, 3], [5, 4, 0]]) == -1


def test_sliding_puzzle_five_moves():
    assert sliding_puzzle([[4, 1, 2], [5, 0, 3]]) == 5


def test_sliding_puzzle_already_solved():
    assert sliding_puzzle([[1, 2, 3], [4, 5, 0]]) == 0


def test_sliding_puzzle_long():
    assert sliding_puzzle([[3, 2, 4], [1, 5, 0]]) == 14
