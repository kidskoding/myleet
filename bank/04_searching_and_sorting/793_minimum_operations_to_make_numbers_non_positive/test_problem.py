from solution import min_operations


def test_min_operations_example_one():
    assert min_operations([3, 4, 1, 7, 6], 4, 2) == 3


def test_min_operations_example_two():
    assert min_operations([1, 2, 1], 2, 1) == 1


def test_min_operations_single_element():
    assert min_operations([10], 3, 1) == 4


def test_min_operations_all_ones():
    assert min_operations([1, 1, 1, 1], 5, 1) == 1


def test_min_operations_y_dominates():
    assert min_operations([5, 5, 5], 3, 2) == 3


def test_min_operations_large_values():
    assert min_operations([1_000_000_000], 1_000_000_000, 1) == 1
