from solution import transpose


def test_transpose_square():
    assert transpose([[1, 2, 3], [4, 5, 6], [7, 8, 9]]) == [[1, 4, 7], [2, 5, 8], [3, 6, 9]]


def test_transpose_rectangle():
    assert transpose([[1, 2, 3], [4, 5, 6]]) == [[1, 4], [2, 5], [3, 6]]


def test_transpose_single_cell():
    assert transpose([[5]]) == [[5]]


def test_transpose_single_row():
    assert transpose([[1, 2, 3]]) == [[1], [2], [3]]


def test_transpose_single_column_negative_values():
    assert transpose([[-1], [0], [10**9]]) == [[-1, 0, 10**9]]
