from solution import nth_ugly_number


def test_nth_ugly_number_two_three_five():
    assert nth_ugly_number(3, 2, 3, 5) == 4


def test_nth_ugly_number_divisor_multiple_of_another():
    assert nth_ugly_number(4, 2, 3, 4) == 6


def test_nth_ugly_number_large_primes():
    assert nth_ugly_number(5, 2, 11, 13) == 10


def test_nth_ugly_number_equal_divisors():
    assert nth_ugly_number(1, 7, 7, 7) == 7
    assert nth_ugly_number(3, 7, 7, 7) == 21


def test_nth_ugly_number_large_input():
    assert nth_ugly_number(1000000000, 2, 217983653, 336916467) == 1999999984
