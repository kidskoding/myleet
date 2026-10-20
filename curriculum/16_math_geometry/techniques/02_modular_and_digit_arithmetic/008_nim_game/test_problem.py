from solution import can_win_nim


def test_can_win_nim_multiple_of_four():
    assert can_win_nim(4) is False


def test_can_win_nim_not_multiple_of_four():
    assert can_win_nim(5) is True


def test_can_win_nim_one_stone():
    assert can_win_nim(1) is True
