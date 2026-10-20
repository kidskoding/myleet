from solution import longest_equal_subarray


def test_longest_equal_subarray_example_one():
    assert longest_equal_subarray([1, 3, 2, 3, 1, 3], 3) == 3


def test_longest_equal_subarray_example_two():
    assert longest_equal_subarray([1, 1, 2, 2, 1, 1], 2) == 4


def test_longest_equal_subarray_single():
    assert longest_equal_subarray([1], 0) == 1


def test_longest_equal_subarray_no_deletions():
    assert longest_equal_subarray([1, 2, 3], 0) == 1


def test_longest_equal_subarray_budget_too_small_to_bridge():
    assert longest_equal_subarray([2, 2, 1, 1, 1, 2, 2], 2) == 3


def test_longest_equal_subarray_one_deletion():
    assert longest_equal_subarray([5, 1, 5, 2, 2, 5, 5], 1) == 2
