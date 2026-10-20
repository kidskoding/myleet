from solution import count_days


def test_count_days_gaps_between_meetings():
    assert count_days(10, [[5, 7], [1, 3], [9, 10]]) == 2


def test_count_days_overlapping_meetings():
    assert count_days(5, [[2, 4], [1, 3]]) == 1


def test_count_days_fully_booked():
    assert count_days(6, [[1, 6]]) == 0


def test_count_days_nested_meetings():
    assert count_days(10, [[2, 9], [3, 4], [5, 5]]) == 2


def test_count_days_adjacent_meetings():
    assert count_days(8, [[1, 2], [3, 4], [6, 6]]) == 3


def test_count_days_large_range():
    assert count_days(1000000000, [[1, 1]]) == 999999999
