from solution import search_insert


def test_search_insert_found():
    assert search_insert([1, 3, 5, 6], 5) == 2


def test_search_insert_middle_gap():
    assert search_insert([1, 3, 5, 6], 2) == 1


def test_search_insert_end():
    assert search_insert([1, 3, 5, 6], 7) == 4


def test_search_insert_beginning():
    assert search_insert([1, 3, 5, 6], 0) == 0


def test_search_insert_empty():
    assert search_insert([], 5) == 0
