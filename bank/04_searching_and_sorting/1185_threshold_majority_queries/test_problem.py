from solution import subarray_majority


def test_subarray_majority_example_one():
    assert subarray_majority([1, 1, 2, 2, 1, 1], [[0, 5, 4], [0, 3, 3], [2, 3, 2]]) == [1, -1, 2]


def test_subarray_majority_example_two():
    assert subarray_majority([3, 2, 3, 2, 3, 2, 3], [[0, 6, 4], [1, 5, 2], [2, 4, 1], [3, 3, 1]]) == [3, 2, 3, 2]


def test_subarray_majority_single_element():
    assert subarray_majority([7], [[0, 0, 1]]) == [7]


def test_subarray_majority_tie_picks_smallest():
    assert subarray_majority([5, 4, 5, 4], [[0, 3, 2], [0, 3, 1]]) == [4, 4]


def test_subarray_majority_threshold_not_met():
    assert subarray_majority([1, 2, 3, 4, 5], [[0, 4, 2], [1, 3, 1]]) == [-1, 2]


def test_subarray_majority_long_range_crossing_blocks():
    nums = [9, 1, 9, 2, 9, 3, 9, 4, 9, 5, 9, 6, 9, 7, 9, 8]
    assert subarray_majority(nums, [[0, 15, 8], [1, 14, 7], [1, 13, 7], [3, 3, 1]]) == [9, 9, -1, 2]
