from solution import min_operations


def test_min_operations_example_one():
    assert min_operations([1, 1, 4, 2, 3], 5) == 2


def test_min_operations_impossible():
    assert min_operations([5, 6, 7, 8, 9], 4) == -1


def test_min_operations_both_ends():
    assert min_operations([3, 2, 20, 1, 1, 3], 10) == 5


def test_min_operations_whole_array():
    assert min_operations([1, 2, 3], 6) == 3


def test_min_operations_single():
    assert min_operations([5], 5) == 1


def test_min_operations_x_too_large():
    assert min_operations([1, 1], 3) == -1
