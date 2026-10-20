from solution import is_subsequence


def test_is_subsequence_true():
    assert is_subsequence("abc", "ahbgdc") is True


def test_is_subsequence_false():
    assert is_subsequence("axc", "ahbgdc") is False


def test_is_subsequence_empty_s():
    assert is_subsequence("", "abc") is True


def test_is_subsequence_empty_t():
    assert is_subsequence("a", "") is False


def test_is_subsequence_order_matters():
    assert is_subsequence("ba", "ab") is False


def test_is_subsequence_repeated_letters():
    assert is_subsequence("aaa", "abaca") is True
