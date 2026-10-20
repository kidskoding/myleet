from solution import search_range


def test_search_range_found():
    assert search_range([5, 7, 7, 8, 8, 10], 8) == [3, 4]


def test_search_range_not_found():
    assert search_range([5, 7, 7, 8, 8, 10], 6) == [-1, -1]


def test_search_range_empty():
    assert search_range([], 0) == [-1, -1]


def test_search_range_single_found():
    assert search_range([5], 5) == [0, 0]


def test_search_range_single_missing():
    assert search_range([5], 3) == [-1, -1]


def test_search_range_all_same():
    assert search_range([2, 2, 2, 2], 2) == [0, 3]
