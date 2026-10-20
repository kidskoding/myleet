from solution import search


def test_search_found_middle():
    assert search([-1, 0, 3, 5, 9, 12], 9) == 4


def test_search_found_first():
    assert search([-1, 0, 3, 5, 9, 12], -1) == 0


def test_search_not_found():
    assert search([-1, 0, 3, 5, 9, 12], 2) == -1


def test_search_empty():
    assert search([], 5) == -1


def test_search_single_found():
    assert search([5], 5) == 0


def test_search_single_missing():
    assert search([5], 3) == -1
