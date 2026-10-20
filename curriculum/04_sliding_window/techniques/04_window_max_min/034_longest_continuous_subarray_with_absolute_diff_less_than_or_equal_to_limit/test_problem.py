from solution import longest_subarray_within_limit


def test_longest_subarray_small_limit():
    assert longest_subarray_within_limit([8, 2, 4, 7], 4) == 2


def test_longest_subarray_normal():
    assert longest_subarray_within_limit([10, 1, 2, 4, 7, 2], 5) == 4


def test_longest_subarray_zero_limit():
    assert longest_subarray_within_limit([4, 2, 2, 2, 4, 4, 2, 2], 0) == 3


def test_longest_subarray_within_limit_small_limit():
    assert longest_subarray_within_limit([8, 2, 4, 7], 4) == 2


def test_longest_subarray_within_limit_normal():
    assert longest_subarray_within_limit([10, 1, 2, 4, 7, 2], 5) == 4


def test_longest_subarray_within_limit_zero_limit():
    assert longest_subarray_within_limit([4, 2, 2, 2, 4, 4, 2, 2], 0) == 3


def test_longest_subarray_within_limit_single_element():
    assert longest_subarray_within_limit([1], 0) == 1
