from solution import is_match_regex


def test_is_match_regex_star():
    assert is_match_regex("aa", "a*") is True


def test_is_match_regex_dot():
    assert is_match_regex("ab", ".*") is True


def test_is_match_regex_false():
    assert is_match_regex("mississippi", "mis*is*p*.") is False
