from solution import search_rotated


def test_search_rotated_found_right_half():
    assert search_rotated([4, 5, 6, 7, 0, 1, 2], 0) == 4


def test_search_rotated_found_left_half():
    assert search_rotated([4, 5, 6, 7, 0, 1, 2], 5) == 1


def test_search_rotated_not_found():
    assert search_rotated([4, 5, 6, 7, 0, 1, 2], 3) == -1


def test_search_rotated_empty():
    assert search_rotated([], 5) == -1


def test_search_rotated_single_found():
    assert search_rotated([1], 1) == 0


def test_search_rotated_single_missing():
    assert search_rotated([1], 0) == -1


def test_search_rotated_no_rotation():
    assert search_rotated([1, 2, 3, 4, 5], 4) == 3
