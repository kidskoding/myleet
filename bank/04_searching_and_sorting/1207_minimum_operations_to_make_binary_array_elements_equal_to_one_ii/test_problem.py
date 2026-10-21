from solution import min_operations


def test_min_operations_example_one():
    assert min_operations([0, 1, 1, 0, 1]) == 4


def test_min_operations_already_ones():
    assert min_operations([1, 1, 1]) == 0


def test_min_operations_all_zeros():
    assert min_operations([0, 0, 0]) == 1


def test_min_operations_alternating():
    assert min_operations([0, 1, 0, 1]) == 4


def test_min_operations_single_zero():
    assert min_operations([0]) == 1
