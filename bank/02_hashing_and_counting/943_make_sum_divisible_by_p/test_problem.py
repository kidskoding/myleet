from solution import min_subarray


def test_min_subarray_remove_one():
    assert min_subarray([3, 1, 4, 2], 6) == 1


def test_min_subarray_remove_two():
    assert min_subarray([6, 3, 5, 2], 9) == 2


def test_min_subarray_already_divisible():
    assert min_subarray([1, 2, 3], 3) == 0


def test_min_subarray_cannot_remove_everything():
    assert min_subarray([1, 2, 3], 7) == -1


def test_min_subarray_single_element():
    assert min_subarray([5], 3) == -1


def test_min_subarray_large_values():
    assert min_subarray([10**9, 10**9, 10**9], 3) == 0
    assert min_subarray([10**9, 1, 10**9], 10**9) == 1
