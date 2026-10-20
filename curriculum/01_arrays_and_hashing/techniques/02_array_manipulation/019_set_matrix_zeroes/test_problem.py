from solution import set_zeroes


def test_set_zeroes_normal():
    matrix = [[1, 1, 1], [1, 0, 1], [1, 1, 1]]
    set_zeroes(matrix)
    assert matrix == [[1, 0, 1], [0, 0, 0], [1, 0, 1]]


def test_set_zeroes_single_element():
    matrix = [[0]]
    set_zeroes(matrix)
    assert matrix == [[0]]


def test_set_zeroes_multiple_zeroes():
    matrix = [[0, 1, 2], [3, 4, 5], [0, 6, 7]]
    set_zeroes(matrix)
    assert matrix == [[0, 0, 0], [0, 4, 5], [0, 0, 0]]
