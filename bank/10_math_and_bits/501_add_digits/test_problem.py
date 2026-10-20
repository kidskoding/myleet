from solution import add_digits


def test_add_digits_example():
    assert add_digits(38) == 2


def test_add_digits_zero():
    assert add_digits(0) == 0


def test_add_digits_single_digit_unchanged():
    assert add_digits(7) == 7


def test_add_digits_multiple_of_nine():
    assert add_digits(99) == 9


def test_add_digits_ten():
    assert add_digits(10) == 1


def test_add_digits_max_int():
    assert add_digits(2**31 - 1) == 1
