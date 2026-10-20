from solution import max_profit_iv


def test_max_profit_iv_one_trade_fits():
    assert max_profit_iv(2, [2, 4, 1]) == 2


def test_max_profit_iv_two_trades():
    assert max_profit_iv(2, [3, 2, 6, 5, 0, 3]) == 7


def test_max_profit_iv_no_trades_allowed():
    assert max_profit_iv(0, [1, 3]) == 0
