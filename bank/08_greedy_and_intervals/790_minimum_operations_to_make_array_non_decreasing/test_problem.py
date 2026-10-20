from solution import min_operations


def test_min_operations_two_drops():
    assert min_operations([3, 3, 2, 1]) == 2


def test_min_operations_one_big_drop():
    assert min_operations([5, 1, 2, 3]) == 4


def test_min_operations_single():
    assert min_operations([7]) == 0


def test_min_operations_already_sorted():
    assert min_operations([1, 2, 2, 5]) == 0


def test_min_operations_zigzag():
    assert min_operations([4, 1, 5, 2, 6]) == 6


def test_min_operations_large_values():
    assert min_operations([1_000_000_000, 1]) == 999_999_999
