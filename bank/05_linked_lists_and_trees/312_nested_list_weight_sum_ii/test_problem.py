from solution import depth_sum_inverse


def test_depth_sum_inverse_example():
    assert depth_sum_inverse([[1, 1], 2, [1, 1]]) == 8


def test_depth_sum_inverse_deep():
    assert depth_sum_inverse([1, [4, [6]]]) == 17


def test_depth_sum_inverse_empty():
    assert depth_sum_inverse([]) == 0


def test_depth_sum_inverse_single_value():
    assert depth_sum_inverse([5]) == 5


def test_depth_sum_inverse_empty_list_does_not_add_depth():
    assert depth_sum_inverse([[], 3]) == 3


def test_depth_sum_inverse_mixed_depths():
    assert depth_sum_inverse([[[1]], 2]) == 7
