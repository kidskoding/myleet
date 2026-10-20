from solution import equal_digit_frequency


def test_equal_digit_frequency_repeated_pair():
    assert equal_digit_frequency("1212") == 5


def test_equal_digit_frequency_palindrome():
    assert equal_digit_frequency("12321") == 9


def test_equal_digit_frequency_single_digit():
    assert equal_digit_frequency("1") == 1


def test_equal_digit_frequency_one_repeated_digit():
    assert equal_digit_frequency("111") == 3


def test_equal_digit_frequency_mixed():
    assert equal_digit_frequency("1221") == 6


def test_equal_digit_frequency_all_distinct_digits():
    assert equal_digit_frequency("0123456789") == 55
