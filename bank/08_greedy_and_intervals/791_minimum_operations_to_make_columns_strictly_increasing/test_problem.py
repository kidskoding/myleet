from solution import minimum_operations


def test_minimum_operations_two_columns():
    assert minimum_operations([[3, 2], [1, 3], [3, 4], [0, 1]]) == 15


def test_minimum_operations_three_columns():
    assert minimum_operations([[3, 2, 1], [2, 1, 0], [1, 2, 3]]) == 12


def test_minimum_operations_single_row():
    assert minimum_operations([[5, 0, 9]]) == 0


def test_minimum_operations_equal_column():
    assert minimum_operations([[0], [0], [0]]) == 3


def test_minimum_operations_already_increasing():
    assert minimum_operations([[1], [2], [3]]) == 0
