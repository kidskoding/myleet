from solution import find_pairs


def test_find_pairs_example():
    assert find_pairs([3, 1, 4, 1, 5], 2) == 2


def test_find_pairs_consecutive():
    assert find_pairs([1, 2, 3, 4, 5], 1) == 4


def test_find_pairs_zero_k():
    assert find_pairs([1, 3, 1, 5, 4], 0) == 1
    assert find_pairs([1, 1, 1, 1], 0) == 1


def test_find_pairs_negatives():
    assert find_pairs([-1, -2, -3], 1) == 2


def test_find_pairs_single():
    assert find_pairs([1], 0) == 0
