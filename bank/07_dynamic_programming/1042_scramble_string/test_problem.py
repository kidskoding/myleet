from solution import is_scramble


def test_is_scramble_great():
    assert is_scramble("great", "rgeat") is True


def test_is_scramble_impossible():
    assert is_scramble("abcde", "caebd") is False


def test_is_scramble_single_char():
    assert is_scramble("a", "a") is True


def test_is_scramble_two_chars_swapped():
    assert is_scramble("ab", "ba") is True


def test_is_scramble_rotation_by_one_split():
    assert is_scramble("abc", "bca") is True


def test_is_scramble_same_letters_not_reachable():
    assert is_scramble("abcd", "bdac") is False
