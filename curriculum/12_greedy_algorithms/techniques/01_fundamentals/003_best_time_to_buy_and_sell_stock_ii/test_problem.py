from solution import max_profit


def test_max_profit_multiple_transactions():
    assert max_profit([7, 1, 5, 3, 6, 4]) == 7


def test_max_profit_monotonic_decreasing():
    assert max_profit([7, 6, 4, 3, 1]) == 0


def test_max_profit_single_day():
    assert max_profit([5]) == 0


def test_max_profit_empty():
    assert max_profit([]) == 0
