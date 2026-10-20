from solution import search_rotated_ii


def test_search_rotated_ii_found_with_duplicates():
    assert search_rotated_ii([2, 5, 6, 0, 0, 1, 2], 0) is True


def test_search_rotated_ii_not_found_with_duplicates():
    assert search_rotated_ii([2, 5, 6, 0, 0, 1, 2], 3) is False


def test_search_rotated_ii_empty():
    assert search_rotated_ii([], 1) is False


def test_search_rotated_ii_single_found():
    assert search_rotated_ii([1], 1) is True


def test_search_rotated_ii_all_same_missing():
    assert search_rotated_ii([1, 1, 1, 1], 2) is False
