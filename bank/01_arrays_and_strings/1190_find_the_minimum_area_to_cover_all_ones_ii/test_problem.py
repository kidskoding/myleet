from solution import minimum_sum


def test_minimum_sum_example_one():
    assert minimum_sum([[1, 0, 1], [1, 1, 1]]) == 5


def test_minimum_sum_example_two():
    assert minimum_sum([[1, 0, 1, 0], [0, 1, 0, 1]]) == 5


def test_minimum_sum_three_ones_diagonal():
    assert minimum_sum([[1, 0, 0], [0, 1, 0], [0, 0, 1]]) == 3
