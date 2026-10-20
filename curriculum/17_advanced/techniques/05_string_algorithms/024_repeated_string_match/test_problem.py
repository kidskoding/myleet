from solution import repeated_string_match


def test_repeated_string_match_normal():
    assert repeated_string_match("abcd", "cdabcdab") == 3


def test_repeated_string_match_impossible():
    assert repeated_string_match("a", "b") == -1


def test_repeated_string_match_already_contains():
    assert repeated_string_match("abc", "b") == 1
