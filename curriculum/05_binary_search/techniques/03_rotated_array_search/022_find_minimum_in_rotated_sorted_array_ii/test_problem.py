from solution import find_min_rotated_ii


def test_find_min_rotated_ii_with_duplicates():
    assert find_min_rotated_ii([2, 2, 2, 0, 1]) == 0


def test_find_min_rotated_ii_no_rotation():
    assert find_min_rotated_ii([1, 1, 1]) == 1


def test_find_min_rotated_ii_single():
    assert find_min_rotated_ii([1]) == 1


def test_find_min_rotated_ii_all_duplicates():
    assert find_min_rotated_ii([2, 2, 2, 2]) == 2
