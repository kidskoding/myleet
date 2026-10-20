from solution import int_to_roman


def test_int_to_roman_large():
    assert int_to_roman(3749) == "MMMDCCXLIX"


def test_int_to_roman_normal():
    assert int_to_roman(58) == "LVIII"


def test_int_to_roman_subtractive():
    assert int_to_roman(1994) == "MCMXCIV"
