from solution import word_pattern


def test_word_pattern_matches():
    assert word_pattern("abba", "dog cat cat dog") is True


def test_word_pattern_wrong_word():
    assert word_pattern("abba", "dog cat cat fish") is False


def test_word_pattern_letter_maps_to_two_words():
    assert word_pattern("aaaa", "dog cat cat dog") is False


def test_word_pattern_two_letters_one_word():
    assert word_pattern("abba", "dog dog dog dog") is False


def test_word_pattern_length_mismatch():
    assert word_pattern("aaa", "aa aa aa aa") is False
    assert word_pattern("ab", "dog") is False


def test_word_pattern_single():
    assert word_pattern("a", "a") is True
