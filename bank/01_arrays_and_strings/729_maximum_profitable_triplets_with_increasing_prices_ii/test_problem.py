from solution import max_profit


def test_max_profit_skips_expensive_first():
    assert max_profit([10, 2, 3, 4], [100, 2, 7, 10]) == 19


def test_max_profit_increasing_prices():
    assert max_profit([1, 2, 3, 4, 5], [1, 5, 3, 4, 6]) == 15


def test_max_profit_decreasing_prices_impossible():
    assert max_profit([4, 3, 2, 1], [33, 20, 19, 87]) == -1


def test_max_profit_equal_prices_not_increasing():
    assert max_profit([1, 1, 1], [5, 5, 5]) == -1


def test_max_profit_exactly_three():
    assert max_profit([1, 2, 3], [1, 1, 1]) == 3


def test_max_profit_large_profit_on_first():
    assert max_profit([5, 1, 6, 2, 7], [10, 1, 1, 1, 1]) == 12
