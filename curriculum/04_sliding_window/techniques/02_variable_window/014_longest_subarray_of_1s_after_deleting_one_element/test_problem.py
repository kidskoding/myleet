from solution import longest_subarray


def test_longest_subarray_one_zero():
    assert longest_subarray([1, 1, 0, 1]) == 3


def test_longest_subarray_multiple_zeros():
    assert longest_subarray([0, 1, 1, 1, 0, 1, 1, 0, 1]) == 5


def test_longest_subarray_all_ones_still_deletes_one():
    assert longest_subarray([1, 1, 1]) == 2
