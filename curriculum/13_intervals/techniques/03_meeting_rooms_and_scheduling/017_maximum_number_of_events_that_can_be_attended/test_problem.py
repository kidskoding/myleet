from solution import max_events


def test_max_events_one_per_day():
    assert max_events([[1, 2], [2, 3], [3, 4]]) == 3


def test_max_events_with_duplicate_window():
    assert max_events([[1, 2], [2, 3], [3, 4], [1, 2]]) == 4
