from solution import min_array_length


def test_min_array_length_mixed():
    assert min_array_length([2, 3, 3, 7, 3, 5], 20) == 3


def test_min_array_length_no_merge_possible():
    assert min_array_length([3, 3, 3, 3], 6) == 4


def test_min_array_length_zero_absorbs_all():
    assert min_array_length([5, 0, 7], 1) == 1


def test_min_array_length_single():
    assert min_array_length([9], 1) == 1


def test_min_array_length_ones_merge():
    assert min_array_length([1, 1, 1], 1) == 1


def test_min_array_length_product_too_big():
    assert min_array_length([10, 10], 50) == 2
