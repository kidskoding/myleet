from solution import CountIntervals


def test_count_intervals_example():
    intervals = CountIntervals()
    intervals.add(2, 3)
    intervals.add(7, 10)
    assert intervals.count() == 6
    intervals.add(5, 8)
    assert intervals.count() == 8


def test_count_intervals_empty():
    assert CountIntervals().count() == 0


def test_count_intervals_adjacent_intervals_do_not_double_count():
    intervals = CountIntervals()
    intervals.add(1, 2)
    intervals.add(3, 4)
    intervals.add(2, 3)
    assert intervals.count() == 4


def test_count_intervals_covering_interval_swallows_others():
    intervals = CountIntervals()
    intervals.add(5, 6)
    intervals.add(10, 12)
    intervals.add(20, 20)
    intervals.add(1, 30)
    assert intervals.count() == 30
    intervals.add(8, 9)
    assert intervals.count() == 30


def test_count_intervals_repeated_add():
    intervals = CountIntervals()
    intervals.add(4, 4)
    intervals.add(4, 4)
    assert intervals.count() == 1


def test_count_intervals_huge_range():
    intervals = CountIntervals()
    intervals.add(1, 10**9)
    assert intervals.count() == 10**9
