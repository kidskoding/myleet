from solution import my_pow


def test_my_pow_positive_exponent():
    assert my_pow(2.0, 10) == 1024.0


def test_my_pow_negative_exponent():
    assert my_pow(2.0, -2) == 0.25


def test_my_pow_zero_exponent():
    assert my_pow(2.0, 0) == 1.0


def test_my_pow_base_one():
    assert my_pow(1.0, 100) == 1.0
