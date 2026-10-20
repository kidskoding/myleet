from solution import coin_change


def test_coin_change_normal():
    assert coin_change([1, 2, 5], 11) == 3


def test_coin_change_impossible():
    assert coin_change([2], 3) == -1


def test_coin_change_zero_amount():
    assert coin_change([1], 0) == 0


def test_coin_change_empty_coins():
    assert coin_change([], 7) == -1
