from solution import max_operations


def test_max_operations_example_one():
    assert max_operations([1, 2, 3, 4], 5) == 2


def test_max_operations_example_two():
    assert max_operations([3, 1, 3, 4, 3], 6) == 1


def test_max_operations_single():
    assert max_operations([1], 2) == 0


def test_max_operations_equal_halves():
    assert max_operations([3, 3, 3, 3], 6) == 2


def test_max_operations_odd_count_of_half():
    assert max_operations([2, 2, 2], 4) == 1


def test_max_operations_extra_duplicates():
    assert max_operations([1, 1, 2, 3, 4, 5], 5) == 2
