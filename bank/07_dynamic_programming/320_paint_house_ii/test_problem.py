from solution import min_cost_ii


def test_min_cost_ii_example():
    assert min_cost_ii([[1, 5, 3], [2, 9, 4]]) == 5


def test_min_cost_ii_two_colors():
    assert min_cost_ii([[1, 3], [2, 4]]) == 5


def test_min_cost_ii_no_houses():
    assert min_cost_ii([]) == 0


def test_min_cost_ii_single_house_single_color():
    assert min_cost_ii([[8]]) == 8


def test_min_cost_ii_same_costs_every_row():
    assert min_cost_ii([[1, 2, 3], [1, 2, 3], [1, 2, 3]]) == 4


def test_min_cost_ii_cheapest_color_repeated():
    assert min_cost_ii([[1, 9, 9, 9], [1, 9, 9, 2], [1, 9, 9, 9]]) == 4
