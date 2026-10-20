from solution import max_profit_with_cooldown


def test_max_profit_with_cooldown_normal():
    assert max_profit_with_cooldown([1, 2, 3, 0, 2]) == 3


def test_max_profit_with_cooldown_empty():
    assert max_profit_with_cooldown([]) == 0


def test_max_profit_with_cooldown_no_profit():
    assert max_profit_with_cooldown([5, 4, 3, 2, 1]) == 0
