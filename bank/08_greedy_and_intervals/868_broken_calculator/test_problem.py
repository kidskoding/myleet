from solution import broken_calc


def test_broken_calc_double_then_decrement():
    assert broken_calc(2, 3) == 2


def test_broken_calc_decrement_then_double():
    assert broken_calc(5, 8) == 2


def test_broken_calc_three_steps():
    assert broken_calc(3, 10) == 3


def test_broken_calc_already_equal():
    assert broken_calc(7, 7) == 0


def test_broken_calc_target_below_start():
    assert broken_calc(1024, 1) == 1023


def test_broken_calc_large_target():
    assert broken_calc(1, 1000000000) == 39
