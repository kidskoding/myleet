from solution import find_column_width


def test_find_column_width_single_column():
    assert find_column_width([[1], [22], [333]]) == [3]


def test_find_column_width_negatives():
    assert find_column_width([[-15, 1, 3], [15, 7, 12], [5, 6, -2]]) == [3, 1, 2]


def test_find_column_width_zero():
    assert find_column_width([[0]]) == [1]


def test_find_column_width_limit():
    assert find_column_width([[-1000000000]]) == [11]


def test_find_column_width_two_by_two():
    assert find_column_width([[10, -1], [5, 100]]) == [2, 3]
