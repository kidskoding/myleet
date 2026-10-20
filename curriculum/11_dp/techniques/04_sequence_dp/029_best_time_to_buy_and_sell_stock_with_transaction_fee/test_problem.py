from solution import max_profit_with_fee


def test_max_profit_with_fee_normal():
    assert max_profit_with_fee([1, 3, 2, 8, 4, 9], 2) == 8


def test_max_profit_with_fee_empty():
    assert max_profit_with_fee([], 1) == 0
