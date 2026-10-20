from solution import reverse_vowels


def test_reverse_vowels_mixed_case():
    assert reverse_vowels("IceCreAm") == "AceCreIm"


def test_reverse_vowels_lowercase():
    assert reverse_vowels("leetcode") == "leotcede"


def test_reverse_vowels_single_char():
    assert reverse_vowels("a") == "a"


def test_reverse_vowels_no_vowels():
    assert reverse_vowels("bcd") == "bcd"


def test_reverse_vowels_case_preserved_per_char():
    assert reverse_vowels("aA") == "Aa"


def test_reverse_vowels_with_symbols():
    assert reverse_vowels("a.b,e") == "e.b,a"
