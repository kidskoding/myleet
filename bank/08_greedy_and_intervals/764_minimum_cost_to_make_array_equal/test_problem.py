from solution import min_cost


def test_min_cost_example():
    assert min_cost([1, 3, 5, 2], [2, 3, 1, 14]) == 8


def test_min_cost_already_equal():
    assert min_cost([2, 2, 2, 2, 2], [4, 2, 8, 1, 3]) == 0


def test_min_cost_single():
    assert min_cost([5], [3]) == 0


def test_min_cost_two_far_apart():
    assert min_cost([1, 100], [1, 1]) == 99


def test_min_cost_heavy_weight_pulls_target():
    assert min_cost([1, 2, 3], [1, 1, 10]) == 3
