from solution import longest_nice_subarray


def test_longest_nice_subarray_normal():
    assert longest_nice_subarray([1, 3, 8, 48, 10]) == 3


def test_longest_nice_subarray_all_overlap():
    assert longest_nice_subarray([3, 1, 5, 11, 13]) == 1
