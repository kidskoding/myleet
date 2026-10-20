from solution import change


def test_change_normal():
    assert change(5, [1, 2, 5]) == 4


def test_change_no_combination():
    assert change(3, [2]) == 0


def test_change_zero_amount():
    assert change(0, [1, 2, 3]) == 1


def test_change_empty_coins():
    assert change(0, []) == 1
