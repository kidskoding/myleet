from solution import minimum_effort


def test_minimum_effort_example_one():
    assert minimum_effort([[1, 2], [2, 4], [4, 8]]) == 8


def test_minimum_effort_example_two():
    assert minimum_effort([[1, 3], [2, 4], [10, 11], [10, 12], [8, 9]]) == 32


def test_minimum_effort_example_three():
    assert minimum_effort([[1, 7], [2, 8], [3, 9], [4, 10], [5, 11], [6, 12]]) == 27


def test_minimum_effort_single():
    assert minimum_effort([[1, 1]]) == 1


def test_minimum_effort_order_matters():
    assert minimum_effort([[5, 5], [1, 10]]) == 10
