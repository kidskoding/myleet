from solution import minimum_deletions


def test_minimum_deletions_k_zero():
    assert minimum_deletions("aabcaba", 0) == 3


def test_minimum_deletions_trim_and_drop():
    assert minimum_deletions("dabdcbdcdcd", 2) == 2


def test_minimum_deletions_drop_rare_letter():
    assert minimum_deletions("aaabaaa", 2) == 1


def test_minimum_deletions_single_char():
    assert minimum_deletions("a", 0) == 0


def test_minimum_deletions_three_counts():
    assert minimum_deletions("aabbbcccc", 0) == 3
