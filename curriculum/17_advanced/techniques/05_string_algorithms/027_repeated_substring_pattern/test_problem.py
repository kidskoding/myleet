from solution import repeated_substring_pattern


def test_repeated_substring_pattern_true():
    assert repeated_substring_pattern("abab") is True


def test_repeated_substring_pattern_false():
    assert repeated_substring_pattern("aba") is False


def test_repeated_substring_pattern_longer():
    assert repeated_substring_pattern("abcabcabcabc") is True
