from solution import gcd_of_strings


def test_gcd_of_strings_clean_divisor():
    assert gcd_of_strings("ABCABC", "ABC") == "ABC"


def test_gcd_of_strings_smaller_divisor():
    assert gcd_of_strings("ABABAB", "ABAB") == "AB"


def test_gcd_of_strings_no_common():
    assert gcd_of_strings("LEET", "CODE") == ""
