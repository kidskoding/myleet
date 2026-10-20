from solution import min_cost


def test_min_cost_example_one_swap():
    assert min_cost([4, 2, 2, 2], [1, 4, 1, 2]) == 1


def test_min_cost_example_impossible():
    assert min_cost([2, 3, 4, 1], [3, 2, 5, 1]) == -1


def test_min_cost_already_equal():
    assert min_cost([3, 1, 2], [2, 3, 1]) == 0


def test_min_cost_swap_through_cheapest():
    assert min_cost([1, 10, 10], [1, 20, 20]) == 2


def test_min_cost_direct_swap_cheaper():
    assert min_cost([2, 3, 3], [2, 4, 4]) == 3
