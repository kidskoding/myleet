from solution import min_cost


def test_min_cost_normal_case():
    grid = [[1, 1, 1, 1], [2, 2, 2, 2], [1, 1, 1, 1], [2, 2, 2, 2]]

    assert min_cost(grid) == 3


def test_min_cost_no_changes_needed():
    assert min_cost([[1, 1], [1, 1]]) == 0
