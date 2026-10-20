from solution import maximum_profit


def test_maximum_profit_example_one():
    assert maximum_profit([5, 4, 6, 2, 3], [8, 5, 4, 3, 5], 10) == 6


def test_maximum_profit_single_best_stock():
    assert maximum_profit([2, 2, 5], [3, 4, 10], 6) == 5


def test_maximum_profit_nothing_affordable():
    assert maximum_profit([3, 3, 12], [0, 3, 15], 10) == 0


def test_maximum_profit_zero_budget():
    assert maximum_profit([1, 2], [5, 6], 0) == 0


def test_maximum_profit_free_stock():
    assert maximum_profit([0, 4], [5, 9], 0) == 5


def test_maximum_profit_all_fit():
    assert maximum_profit([1, 2, 3], [2, 4, 6], 100) == 6
