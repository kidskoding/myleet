from solution import find_diagonal_order


def test_find_diagonal_order_square():
    assert find_diagonal_order([[1, 2, 3], [4, 5, 6], [7, 8, 9]]) == [1, 2, 4, 7, 5, 3, 6, 8, 9]


def test_find_diagonal_order_two_by_two():
    assert find_diagonal_order([[1, 2], [3, 4]]) == [1, 2, 3, 4]


def test_find_diagonal_order_single_row():
    assert find_diagonal_order([[1, 2, 3]]) == [1, 2, 3]


def test_find_diagonal_order_single_column():
    assert find_diagonal_order([[1], [2], [3]]) == [1, 2, 3]


def test_find_diagonal_order_single_cell():
    assert find_diagonal_order([[5]]) == [5]


def test_find_diagonal_order_wide():
    mat = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]]
    assert find_diagonal_order(mat) == [1, 2, 5, 9, 6, 3, 4, 7, 10, 11, 8, 12]
