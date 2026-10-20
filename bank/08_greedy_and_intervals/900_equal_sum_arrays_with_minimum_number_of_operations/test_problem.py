from solution import min_operations


def test_min_operations_example():
    assert min_operations([1, 2, 3, 4, 5, 6], [1, 1, 2, 2, 2, 2]) == 3


def test_min_operations_impossible():
    assert min_operations([1, 1, 1, 1, 1, 1, 1], [6]) == -1


def test_min_operations_short_arrays():
    assert min_operations([6, 6], [1]) == 3


def test_min_operations_already_equal():
    assert min_operations([1, 2], [3]) == 0


def test_min_operations_single_change():
    assert min_operations([6], [1]) == 1


def test_min_operations_needs_partial_gain():
    assert min_operations([1, 1], [6, 6, 6]) == 4
