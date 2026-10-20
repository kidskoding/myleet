from solution import most_visited


def test_most_visited_forward_range():
    assert most_visited(4, [1, 3, 1, 2]) == [1, 2]


def test_most_visited_two_sectors():
    assert most_visited(2, [2, 1, 2, 1, 2, 1, 2, 1, 2]) == [2]


def test_most_visited_full_track():
    assert most_visited(7, [1, 3, 5, 7]) == [1, 2, 3, 4, 5, 6, 7]


def test_most_visited_wraps_around():
    assert most_visited(5, [4, 2]) == [1, 2, 4, 5]


def test_most_visited_ends_where_started():
    assert most_visited(3, [2, 1, 2]) == [2]
