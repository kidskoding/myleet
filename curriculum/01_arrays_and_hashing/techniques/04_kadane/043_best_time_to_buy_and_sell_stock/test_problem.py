from solution import max_profit


def test_max_profit_normal():
    assert max_profit([7, 1, 5, 3, 6, 4]) == 5


def test_max_profit_no_profit():
    assert max_profit([7, 6, 4, 3, 1]) == 0


def test_max_profit_single_price():
    assert max_profit([5]) == 0


def test_max_profit_empty():
    assert max_profit([]) == 0
