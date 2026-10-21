from solution import min_sum_square_diff


def test_min_sum_square_diff_example_one():
    assert min_sum_square_diff([1, 2, 3, 4], [2, 10, 20, 19], 0, 0) == 579


def test_min_sum_square_diff_example_two():
    assert min_sum_square_diff([1, 4, 10, 12], [5, 8, 6, 9], 1, 1) == 43


def test_min_sum_square_diff_zero_ops():
    assert min_sum_square_diff([1, 2], [3, 5], 0, 0) == 13


def test_min_sum_square_diff_enough_ops_to_zero():
    assert min_sum_square_diff([1, 2, 3], [4, 5, 6], 100, 100) == 0


def test_min_sum_square_diff_single():
    assert min_sum_square_diff([10], [1], 3, 2) == 16
