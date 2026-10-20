from solution import is_valid


def test_is_valid_mixed_word():
    assert is_valid("234Adas") is True


def test_is_valid_too_short():
    assert is_valid("b3") is False


def test_is_valid_symbol_rejected():
    assert is_valid("a3$e") is False


def test_is_valid_needs_consonant():
    assert is_valid("aei") is False
    assert is_valid("12a") is False


def test_is_valid_needs_vowel():
    assert is_valid("bcd") is False


def test_is_valid_uppercase_vowel():
    assert is_valid("Ab1") is True
