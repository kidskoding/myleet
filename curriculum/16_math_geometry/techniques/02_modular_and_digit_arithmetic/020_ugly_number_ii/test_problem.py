from solution import nth_ugly_number


def test_nth_ugly_number_tenth():
    assert nth_ugly_number(10) == 12


def test_nth_ugly_number_first():
    assert nth_ugly_number(1) == 1
