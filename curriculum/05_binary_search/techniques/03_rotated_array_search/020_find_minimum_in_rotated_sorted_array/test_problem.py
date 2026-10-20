from solution import find_min_rotated


def test_find_min_rotated_middle_pivot():
    assert find_min_rotated([4, 5, 6, 7, 0, 1, 2]) == 0


def test_find_min_rotated_no_rotation():
    assert find_min_rotated([1, 2, 3, 4, 5]) == 1


def test_find_min_rotated_single():
    assert find_min_rotated([1]) == 1


def test_find_min_rotated_two_elements():
    assert find_min_rotated([2, 1]) == 1


def test_find_min_rotated_small_rotation():
    assert find_min_rotated([3, 1, 2]) == 1
