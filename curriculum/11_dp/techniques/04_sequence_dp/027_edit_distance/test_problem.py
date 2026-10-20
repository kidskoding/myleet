from solution import min_distance


def test_min_distance_normal():
    assert min_distance("horse", "ros") == 3


def test_min_distance_same_word():
    assert min_distance("abc", "abc") == 0


def test_min_distance_empty_source():
    assert min_distance("", "abc") == 3
