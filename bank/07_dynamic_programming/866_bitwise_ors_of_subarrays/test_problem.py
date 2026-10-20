from solution import subarray_bitwise_ors


def test_subarray_bitwise_ors_single_zero():
    assert subarray_bitwise_ors([0]) == 1


def test_subarray_bitwise_ors_with_duplicates():
    assert subarray_bitwise_ors([1, 1, 2]) == 3


def test_subarray_bitwise_ors_powers_of_two():
    assert subarray_bitwise_ors([1, 2, 4]) == 6


def test_subarray_bitwise_ors_all_equal():
    assert subarray_bitwise_ors([5, 5, 5, 5]) == 1


def test_subarray_bitwise_ors_mixed():
    assert subarray_bitwise_ors([3, 0, 4, 1]) == 6
