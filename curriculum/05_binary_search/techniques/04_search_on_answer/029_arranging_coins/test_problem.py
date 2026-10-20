from solution import arrange_coins


def test_arrange_coins_partial_last_row():
    assert arrange_coins(5) == 2


def test_arrange_coins_normal():
    assert arrange_coins(8) == 3


def test_arrange_coins_single():
    assert arrange_coins(1) == 1
