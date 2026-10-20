from solution import incremovable_subarray_count


def test_incremovable_subarray_count_already_increasing():
    assert incremovable_subarray_count([1, 2, 3, 4]) == 10


def test_incremovable_subarray_count_one_dip():
    assert incremovable_subarray_count([6, 5, 7, 8]) == 7


def test_incremovable_subarray_count_equal_tail_values():
    assert incremovable_subarray_count([8, 7, 6, 6]) == 3


def test_incremovable_subarray_count_single_element():
    assert incremovable_subarray_count([5]) == 1


def test_incremovable_subarray_count_duplicates():
    assert incremovable_subarray_count([1, 1]) == 3


def test_incremovable_subarray_count_prefix_and_suffix_kept():
    assert incremovable_subarray_count([3, 1, 2, 5, 4, 6]) == 6
