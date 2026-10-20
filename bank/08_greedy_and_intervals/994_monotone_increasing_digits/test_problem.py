from solution import monotone_increasing_digits


def test_monotone_increasing_digits_ten():
    assert monotone_increasing_digits(10) == 9


def test_monotone_increasing_digits_already_monotone():
    assert monotone_increasing_digits(1234) == 1234


def test_monotone_increasing_digits_cascade():
    assert monotone_increasing_digits(332) == 299


def test_monotone_increasing_digits_zero():
    assert monotone_increasing_digits(0) == 0


def test_monotone_increasing_digits_drop_middle():
    assert monotone_increasing_digits(120) == 119


def test_monotone_increasing_digits_upper_limit():
    assert monotone_increasing_digits(1000000000) == 999999999
