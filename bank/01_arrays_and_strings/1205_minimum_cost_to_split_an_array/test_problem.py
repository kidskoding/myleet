from solution import min_cost


def test_min_cost_example_one():
    assert min_cost([1, 2, 1, 2, 1, 3, 3], 2) == 8


def test_min_cost_example_two():
    assert min_cost([1, 2, 1, 2, 1], 2) == 6


def test_min_cost_example_three():
    assert min_cost([1, 2, 1, 2, 1], 5) == 10


def test_min_cost_single():
    assert min_cost([0], 1) == 1
