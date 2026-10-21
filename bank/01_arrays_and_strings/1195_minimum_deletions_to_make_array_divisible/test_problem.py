from solution import min_operations


def test_min_operations_example_one():
    assert min_operations([2, 3, 2, 4, 3], [9, 6, 9, 3, 15]) == 2


def test_min_operations_example_two():
    assert min_operations([4, 3, 6], [8, 2, 6, 10]) == -1


def test_min_operations_already():
    assert min_operations([2, 2], [4, 6]) == 0


def test_min_operations_single():
    assert min_operations([1], [7]) == 0
