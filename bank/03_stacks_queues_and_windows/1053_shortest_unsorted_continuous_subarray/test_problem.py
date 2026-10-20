from solution import find_unsorted_subarray


def test_find_unsorted_subarray_middle():
    assert find_unsorted_subarray([2, 6, 4, 8, 10, 9, 15]) == 5


def test_find_unsorted_subarray_sorted():
    assert find_unsorted_subarray([1, 2, 3, 4]) == 0


def test_find_unsorted_subarray_single():
    assert find_unsorted_subarray([1]) == 0


def test_find_unsorted_subarray_reversed_pair():
    assert find_unsorted_subarray([2, 1]) == 2


def test_find_unsorted_subarray_duplicates():
    assert find_unsorted_subarray([1, 3, 2, 2, 2]) == 4


def test_find_unsorted_subarray_sorted_with_duplicates():
    assert find_unsorted_subarray([1, 2, 3, 3, 3]) == 0
