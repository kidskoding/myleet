from solution import min_size_subarray


def test_min_size_subarray_within_one_copy():
    assert min_size_subarray([1, 2, 3], 5) == 2


def test_min_size_subarray_wraps_around():
    assert min_size_subarray([1, 1, 1, 2, 3], 4) == 2


def test_min_size_subarray_impossible():
    assert min_size_subarray([2, 4, 6, 8], 3) == -1


def test_min_size_subarray_exact_multiple():
    assert min_size_subarray([1, 2, 3], 12) == 6


def test_min_size_subarray_many_copies_plus_rest():
    assert min_size_subarray([3, 1, 2], 1_000_000_000) == 1_000_000_000 // 6 * 3 + 2


def test_min_size_subarray_single_element():
    assert min_size_subarray([5], 15) == 3
