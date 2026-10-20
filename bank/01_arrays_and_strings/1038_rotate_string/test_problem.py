from solution import rotate_string


def test_rotate_string_true():
    assert rotate_string("abcde", "cdeab") is True


def test_rotate_string_false():
    assert rotate_string("abcde", "abced") is False


def test_rotate_string_single_char():
    assert rotate_string("a", "a") is True


def test_rotate_string_length_mismatch():
    assert rotate_string("aa", "a") is False


def test_rotate_string_repeated_pattern():
    assert rotate_string("abab", "baba") is True
