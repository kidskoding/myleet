from solution import increasing_triplet


def test_increasing_triplet_sorted():
    assert increasing_triplet([1, 2, 3, 4, 5]) is True


def test_increasing_triplet_descending():
    assert increasing_triplet([5, 4, 3, 2, 1]) is False


def test_increasing_triplet_out_of_order():
    assert increasing_triplet([2, 1, 5, 0, 4, 6]) is True


def test_increasing_triplet_all_equal():
    assert increasing_triplet([1, 1, 1]) is False
