from solution import min_operations


def test_min_operations_example_one():
    assert min_operations([5, 2, 5, 4, 5], 2) == 2


def test_min_operations_value_below_k():
    assert min_operations([2, 1, 2], 2) == -1


def test_min_operations_all_distinct():
    assert min_operations([9, 7, 5, 3], 1) == 4


def test_min_operations_already_equal():
    assert min_operations([3, 3, 3], 3) == 0


def test_min_operations_single_level():
    assert min_operations([5, 5], 3) == 1
