from solution import longest_subarray


def test_longest_subarray_example_one():
    assert longest_subarray([1, 2, 3, 1, 2]) == 4


def test_longest_subarray_all_equal():
    assert longest_subarray([2, 2, 2, 2, 2]) == 5


def test_longest_subarray_single():
    assert longest_subarray([7]) == 1


def test_longest_subarray_strictly_decreasing():
    assert longest_subarray([5, 4, 3, 2, 1]) == 2


def test_longest_subarray_already_sorted():
    assert longest_subarray([1, 2, 3, 4]) == 4
