from solution import maximum_robots


def test_maximum_robots_normal():
    assert maximum_robots([3, 6, 1, 3, 4], [2, 1, 3, 4, 5], 25) == 3


def test_maximum_robots_budget_too_small():
    assert maximum_robots([11, 12, 19], [10, 8, 7], 19) == 0
