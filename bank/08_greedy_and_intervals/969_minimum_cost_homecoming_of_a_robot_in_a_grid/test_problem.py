from solution import min_cost


def test_min_cost_example_one():
    assert min_cost([1, 0], [2, 3], [5, 4, 3], [8, 2, 6, 7]) == 18


def test_min_cost_already_home():
    assert min_cost([0, 0], [0, 0], [5], [26]) == 0


def test_min_cost_up_and_left():
    assert min_cost([2, 3], [0, 0], [5, 4, 3], [8, 2, 6, 7]) == 25


def test_min_cost_same_row():
    assert min_cost([0, 0], [0, 2], [1], [3, 4, 5]) == 9


def test_min_cost_zero_costs():
    assert min_cost([0, 0], [1, 1], [0, 0], [0, 0]) == 0
