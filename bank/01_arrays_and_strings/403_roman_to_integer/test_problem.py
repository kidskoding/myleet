from solution import roman_to_int


def test_roman_to_int_simple_additive():
    assert roman_to_int("III") == 3


def test_roman_to_int_single_symbol():
    assert roman_to_int("M") == 1000


def test_roman_to_int_mixed():
    assert roman_to_int("LVIII") == 58


def test_roman_to_int_subtractive_pairs():
    assert roman_to_int("MCMXCIV") == 1994


def test_roman_to_int_four_and_nine():
    assert roman_to_int("IV") == 4
    assert roman_to_int("IX") == 9


def test_roman_to_int_max():
    assert roman_to_int("MMMCMXCIX") == 3999
