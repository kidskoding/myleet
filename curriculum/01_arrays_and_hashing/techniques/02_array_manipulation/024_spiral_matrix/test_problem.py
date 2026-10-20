from solution import spiral_order


def test_spiral_order_square():
    assert spiral_order([[1, 2, 3], [4, 5, 6], [7, 8, 9]]) == [1, 2, 3, 6, 9, 8, 7, 4, 5]


def test_spiral_order_wide():
    matrix = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]]
    assert spiral_order(matrix) == [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7]


def test_spiral_order_single_cell():
    assert spiral_order([[7]]) == [7]


def test_spiral_order_two_by_two():
    assert spiral_order([[1, 2], [3, 4]]) == [1, 2, 4, 3]
