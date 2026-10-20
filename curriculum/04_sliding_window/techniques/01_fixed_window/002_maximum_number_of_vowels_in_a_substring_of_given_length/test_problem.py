from solution import max_vowels


def test_max_vowels_normal():
    assert max_vowels("abciiidef", 3) == 3


def test_max_vowels_all_vowels():
    assert max_vowels("aeiou", 2) == 2


def test_max_vowels_spread_out():
    assert max_vowels("leetcode", 3) == 2


def test_max_vowels_no_vowels():
    assert max_vowels("bcdfg", 2) == 0
