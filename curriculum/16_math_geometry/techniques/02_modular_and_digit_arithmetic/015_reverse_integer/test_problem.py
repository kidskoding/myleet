from solution import reverse


def test_reverse_positive():
    assert reverse(123) == 321


def test_reverse_negative():
    assert reverse(-123) == -321


def test_reverse_trailing_zero():
    assert reverse(120) == 21


def test_reverse_overflow_returns_zero():
    assert reverse(1534236469) == 0
