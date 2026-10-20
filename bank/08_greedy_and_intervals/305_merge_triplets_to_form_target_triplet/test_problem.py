from solution import merge_triplets


def test_merge_triplets_example():
    assert merge_triplets([[2, 5, 3], [1, 8, 4], [1, 7, 5]], [2, 7, 5]) is True


def test_merge_triplets_impossible():
    assert merge_triplets([[3, 4, 5], [4, 5, 6]], [3, 2, 5]) is False


def test_merge_triplets_needs_several():
    assert merge_triplets([[2, 5, 3], [2, 3, 4], [1, 2, 5], [5, 2, 3]], [5, 5, 5]) is True


def test_merge_triplets_single_exact():
    assert merge_triplets([[1, 2, 3]], [1, 2, 3]) is True


def test_merge_triplets_single_too_small():
    assert merge_triplets([[1, 1, 1]], [1, 1, 2]) is False


def test_merge_triplets_overshooting_triplet_poisons():
    assert merge_triplets([[1, 3, 1], [3, 1, 4]], [3, 3, 3]) is False
