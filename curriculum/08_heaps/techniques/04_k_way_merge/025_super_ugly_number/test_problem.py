from solution import nth_super_ugly_number


def test_nth_super_ugly_number_normal():
    assert nth_super_ugly_number(12, [2, 7, 13, 19]) == 32


def test_nth_super_ugly_number_first_is_one():
    assert nth_super_ugly_number(1, [2, 3, 5]) == 1
