from solution import minimum_operations_to_write_y


def test_minimum_operations_to_write_y_three_by_three():
    assert minimum_operations_to_write_y([[1, 2, 2], [1, 1, 0], [0, 1, 0]]) == 3


def test_minimum_operations_to_write_y_five_by_five():
    grid = [[0, 1, 0, 1, 0], [2, 1, 0, 1, 2], [2, 2, 2, 0, 1], [2, 2, 2, 2, 2], [2, 1, 2, 2, 2]]
    assert minimum_operations_to_write_y(grid) == 12


def test_minimum_operations_to_write_y_all_zero():
    assert minimum_operations_to_write_y([[0, 0, 0], [0, 0, 0], [0, 0, 0]]) == 4


def test_minimum_operations_to_write_y_already_written():
    assert minimum_operations_to_write_y([[1, 0, 1], [0, 1, 0], [0, 1, 0]]) == 0


def test_minimum_operations_to_write_y_inverted_colors():
    assert minimum_operations_to_write_y([[2, 1, 2], [1, 2, 1], [1, 2, 1]]) == 0
