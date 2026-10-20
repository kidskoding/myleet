from solution import find_max_value_of_equation


def test_find_max_value_of_equation_normal():
    assert find_max_value_of_equation([[1, 3], [2, 0], [5, 10], [6, -10]], 1) == 4


def test_find_max_value_of_equation_wider_k():
    assert find_max_value_of_equation([[0, 0], [3, 0], [9, 2]], 3) == 3
