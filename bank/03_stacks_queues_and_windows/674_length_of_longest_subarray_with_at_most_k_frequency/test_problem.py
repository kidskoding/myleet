from solution import max_subarray_length


def test_max_subarray_length_example_one():
    assert max_subarray_length([1, 2, 3, 1, 2, 3, 1, 2], 2) == 6


def test_max_subarray_length_k_one():
    assert max_subarray_length([1, 2, 1, 2, 1, 2, 1, 2], 1) == 2


def test_max_subarray_length_all_same():
    assert max_subarray_length([5, 5, 5, 5, 5, 5, 5], 4) == 4


def test_max_subarray_length_single():
    assert max_subarray_length([1], 1) == 1


def test_max_subarray_length_whole_array():
    assert max_subarray_length([1, 1, 2, 2], 2) == 4
