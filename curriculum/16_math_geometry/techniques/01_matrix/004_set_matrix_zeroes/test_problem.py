from solution import set_zeroes


def test_set_zeroes_normal():
    matrix = [[1, 1, 1], [1, 0, 1], [1, 1, 1]]
    set_zeroes(matrix)
    assert matrix == [[1, 0, 1], [0, 0, 0], [1, 0, 1]]


def test_set_zeroes_no_zero():
    matrix = [[1, 2], [3, 4]]
    set_zeroes(matrix)
    assert matrix == [[1, 2], [3, 4]]


def test_set_zeroes_single_cell_zero():
    matrix = [[0]]
    set_zeroes(matrix)
    assert matrix == [[0]]
