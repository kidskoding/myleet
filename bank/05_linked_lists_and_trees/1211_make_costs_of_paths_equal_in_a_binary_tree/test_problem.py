from solution import min_increments


def test_min_increments_example_one():
    assert min_increments(7, [1, 5, 2, 2, 3, 3, 1]) == 6


def test_min_increments_already_equal():
    assert min_increments(3, [5, 3, 3]) == 0


def test_min_increments_skewed_leaves():
    assert min_increments(3, [1, 10, 1]) == 9


def test_min_increments_deeper_tree():
    assert min_increments(15, [1] * 15) == 0


def test_min_increments_needs_leaf_boost():
    assert min_increments(7, [1, 1, 1, 1, 1, 1, 100]) == 198
