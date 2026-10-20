from solution import max_profit


def test_max_profit_example_one():
    assert max_profit([2, 5], 4) == 14


def test_max_profit_example_two():
    assert max_profit([3, 5], 6) == 19


def test_max_profit_many_colors():
    assert max_profit([2, 8, 4, 10, 6], 20) == 110


def test_max_profit_single_ball():
    assert max_profit([5], 1) == 5


def test_max_profit_sell_everything():
    assert max_profit([3, 3], 6) == 12


def test_max_profit_large_needs_modulo():
    assert max_profit([1000000000], 1000000000) == 21
