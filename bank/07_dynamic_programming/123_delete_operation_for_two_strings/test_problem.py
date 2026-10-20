from solution import min_distance


def test_min_distance_small():
    assert min_distance("sea", "eat") == 2


def test_min_distance_subsequence():
    assert min_distance("leetcode", "etco") == 4


def test_min_distance_identical():
    assert min_distance("a", "a") == 0


def test_min_distance_nothing_in_common():
    assert min_distance("abc", "def") == 6


def test_min_distance_longer_words():
    assert min_distance("intention", "execution") == 8
