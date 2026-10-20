from solution import minimum_cost


def test_minimum_cost_example_one():
    assert minimum_cost([1, 3, 2, 6, 4, 2], 3, 3) == 5


def test_minimum_cost_example_two():
    assert minimum_cost([10, 1, 2, 2, 2, 1], 4, 3) == 15


def test_minimum_cost_tight_distance():
    assert minimum_cost([10, 8, 18, 9], 3, 1) == 36


def test_minimum_cost_minimum_length():
    assert minimum_cost([1, 1, 1], 3, 1) == 3


def test_minimum_cost_window_too_small_for_both_ones():
    assert minimum_cost([3, 10, 1, 10, 10, 1], 3, 2) == 14


def test_minimum_cost_window_reaches_both_ones():
    assert minimum_cost([3, 10, 1, 10, 10, 1], 3, 4) == 5
