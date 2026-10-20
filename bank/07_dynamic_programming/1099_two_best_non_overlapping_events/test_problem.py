from solution import max_two_events


def test_max_two_events_pick_two():
    assert max_two_events([[1, 3, 2], [4, 5, 2], [2, 4, 3]]) == 4


def test_max_two_events_single_best():
    assert max_two_events([[1, 3, 2], [4, 5, 2], [1, 5, 5]]) == 5


def test_max_two_events_same_window():
    assert max_two_events([[1, 5, 3], [1, 5, 1], [6, 6, 5]]) == 8


def test_max_two_events_touching_is_overlap():
    assert max_two_events([[1, 2, 4], [2, 3, 5]]) == 5


def test_max_two_events_adjacent_days():
    assert max_two_events([[1, 1, 1], [2, 2, 2]]) == 3


def test_max_two_events_skip_middle():
    assert max_two_events([[1, 2, 3], [3, 4, 2], [5, 6, 4]]) == 7
