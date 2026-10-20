from solution import min_operations


def test_min_operations_possible():
    assert min_operations([4, 3, 1, 4], [1, 3, 7, 1], 3) == 2


def test_min_operations_sum_mismatch():
    assert min_operations([3, 8, 5, 2], [2, 4, 1, 6], 1) == -1


def test_min_operations_zero_k_equal():
    assert min_operations([1, 2], [1, 2], 0) == 0


def test_min_operations_zero_k_unequal():
    assert min_operations([1, 2], [2, 1], 0) == -1


def test_min_operations_not_a_multiple():
    assert min_operations([1, 4], [3, 2], 3) == -1


def test_min_operations_several_moves():
    assert min_operations([10, 0, 0], [0, 5, 5], 5) == 2
