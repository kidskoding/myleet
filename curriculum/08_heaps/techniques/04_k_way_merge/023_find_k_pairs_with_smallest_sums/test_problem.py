from solution import k_smallest_pairs


def test_k_smallest_pairs_normal():
    assert k_smallest_pairs([1, 7, 11], [2, 4, 6], 3) == [[1, 2], [1, 4], [1, 6]]


def test_k_smallest_pairs_with_duplicates():
    assert k_smallest_pairs([1, 1, 2], [1, 2, 3], 2) == [[1, 1], [1, 1]]


def test_k_smallest_pairs_empty_input():
    assert k_smallest_pairs([], [1, 2], 3) == []
