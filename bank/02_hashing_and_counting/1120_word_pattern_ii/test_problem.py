from solution import word_pattern_match


def test_word_pattern_match_two_letters():
    assert word_pattern_match("abab", "redblueredblue") is True


def test_word_pattern_match_one_letter_repeated():
    assert word_pattern_match("aaaa", "asdasdasdasd") is True


def test_word_pattern_match_no_split_works():
    assert word_pattern_match("aabb", "xyzabcxzyabc") is False


def test_word_pattern_match_single_letter_takes_all():
    assert word_pattern_match("a", "anything") is True


def test_word_pattern_match_bijection_required():
    assert word_pattern_match("ab", "aa") is False


def test_word_pattern_match_pattern_longer_than_string():
    assert word_pattern_match("abc", "ab") is False


def test_word_pattern_match_needs_backtracking():
    assert word_pattern_match("aba", "aaaa") is True
