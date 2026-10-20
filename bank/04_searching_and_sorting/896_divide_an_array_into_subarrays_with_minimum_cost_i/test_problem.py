from solution import minimum_cost


def test_minimum_cost_example_one():
    assert minimum_cost([1, 2, 3, 12]) == 6


def test_minimum_cost_three_elements():
    assert minimum_cost([5, 4, 3]) == 12


def test_minimum_cost_small_tail():
    assert minimum_cost([10, 3, 1, 1]) == 12


def test_minimum_cost_all_equal():
    assert minimum_cost([1, 1, 1]) == 3


def test_minimum_cost_smallest_at_end():
    assert minimum_cost([50, 49, 48, 1, 2]) == 53
