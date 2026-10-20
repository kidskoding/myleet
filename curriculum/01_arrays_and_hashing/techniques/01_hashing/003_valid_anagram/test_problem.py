from solution import is_anagram


def test_is_anagram_true():
    assert is_anagram("anagram", "nagaram") is True


def test_is_anagram_false_different_lengths():
    assert is_anagram("rat", "car") is False


def test_is_anagram_empty_strings():
    assert is_anagram("", "") is True


def test_is_anagram_t_longer_with_repeat():
    assert is_anagram("ab", "aab") is False


def test_is_anagram_same_length_different_counts():
    assert is_anagram("aabb", "abbb") is False


def test_is_anagram_same_letters_wrong_multiplicity():
    assert is_anagram("aacc", "ccac") is False
