from solution import divide


def test_divide_normal():
    assert divide(10, 3) == 3


def test_divide_negative_result_truncates_toward_zero():
    assert divide(7, -3) == -2


def test_divide_overflow_is_clamped():
    assert divide(-2147483648, -1) == 2147483647


def test_divide_by_one():
    assert divide(1, 1) == 1
