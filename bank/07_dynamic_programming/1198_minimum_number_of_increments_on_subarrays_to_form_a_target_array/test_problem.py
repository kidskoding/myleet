from solution import min_number_operations


def test_min_number_operations_mountain():
    assert min_number_operations([1, 2, 3, 2, 1]) == 3


def test_min_number_operations_valley():
    assert min_number_operations([3, 1, 1, 2]) == 4


def test_min_number_operations_mixed():
    assert min_number_operations([3, 1, 5, 4, 2]) == 7


def test_min_number_operations_single():
    assert min_number_operations([6]) == 6


def test_min_number_operations_all_equal():
    assert min_number_operations([4, 4, 4, 4]) == 4


def test_min_number_operations_zigzag():
    assert min_number_operations([1, 5, 1, 5, 1]) == 9
