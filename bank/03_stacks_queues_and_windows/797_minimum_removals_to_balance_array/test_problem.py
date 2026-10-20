from solution import min_removal


def test_min_removal_drop_largest():
    assert min_removal([2, 1, 5], 2) == 1


def test_min_removal_drop_both_ends():
    assert min_removal([1, 6, 2, 9], 3) == 2


def test_min_removal_already_balanced():
    assert min_removal([4, 6], 2) == 0


def test_min_removal_single():
    assert min_removal([5], 1) == 0


def test_min_removal_k_one_keeps_equal_values():
    assert min_removal([1, 2, 3], 1) == 2


def test_min_removal_duplicates_kept_together():
    assert min_removal([3, 3, 3, 10, 1], 1) == 2
