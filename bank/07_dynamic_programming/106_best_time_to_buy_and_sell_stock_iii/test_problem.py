from solution import max_profit


def test_max_profit_two_separate_trades():
    assert max_profit([3, 3, 5, 0, 0, 3, 1, 4]) == 6


def test_max_profit_one_trade_is_best():
    assert max_profit([1, 2, 3, 4, 5]) == 4


def test_max_profit_falling_prices():
    assert max_profit([7, 6, 4, 3, 1]) == 0


def test_max_profit_single_day():
    assert max_profit([1]) == 0


def test_max_profit_picks_best_two_of_three_runs():
    assert max_profit([1, 2, 4, 2, 5, 7, 2, 4, 9, 0]) == 13
