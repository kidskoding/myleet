from solution import spiral_order


def test_spiral_order_normal():
    matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
    assert spiral_order(matrix) == [1, 2, 3, 6, 9, 8, 7, 4, 5]


def test_spiral_order_single_row():
    assert spiral_order([[1, 2, 3, 4]]) == [1, 2, 3, 4]


def test_spiral_order_single_column():
    assert spiral_order([[1], [2], [3]]) == [1, 2, 3]


def test_spiral_order_empty():
    assert spiral_order([]) == []
