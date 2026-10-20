from solution import is_match_wildcard


def test_is_match_wildcard_star():
    assert is_match_wildcard("adceb", "*a*b") is True


def test_is_match_wildcard_question_mark():
    assert is_match_wildcard("cb", "?a") is False


def test_is_match_wildcard_empty_pattern():
    assert is_match_wildcard("", "") is True
