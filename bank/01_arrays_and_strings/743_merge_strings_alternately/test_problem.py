from solution import merge_alternately


def test_merge_alternately_equal_length():
    assert merge_alternately("abc", "pqr") == "apbqcr"


def test_merge_alternately_second_longer():
    assert merge_alternately("ab", "pqrs") == "apbqrs"


def test_merge_alternately_first_longer():
    assert merge_alternately("abcd", "pq") == "apbqcd"


def test_merge_alternately_single_chars():
    assert merge_alternately("a", "z") == "az"


def test_merge_alternately_one_char_vs_many():
    assert merge_alternately("x", "abc") == "xabc"
