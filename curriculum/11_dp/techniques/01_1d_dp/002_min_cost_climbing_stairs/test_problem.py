from solution import min_cost_climbing_stairs


def test_min_cost_climbing_stairs_normal():
    assert min_cost_climbing_stairs([10, 15, 20]) == 15


def test_min_cost_climbing_stairs_alternating():
    assert min_cost_climbing_stairs([1, 100, 1, 1, 1, 100, 1, 1, 100, 1]) == 6


def test_min_cost_climbing_stairs_two_steps():
    assert min_cost_climbing_stairs([0, 0]) == 0
