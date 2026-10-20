from solution import find_crossing_time


def test_find_crossing_time_least_efficient_goes():
    assert find_crossing_time(1, 3, [[1, 1, 2, 1], [1, 1, 3, 1], [1, 1, 4, 1]]) == 6


def test_find_crossing_time_two_workers():
    assert find_crossing_time(3, 2, [[1, 5, 1, 8], [10, 10, 10, 10]]) == 37


def test_find_crossing_time_right_bank_priority():
    assert find_crossing_time(3, 2, [[1, 9, 1, 8], [10, 10, 10, 10]]) == 50


def test_find_crossing_time_single_trip():
    assert find_crossing_time(1, 1, [[1, 1, 1, 1]]) == 3


def test_find_crossing_time_one_worker_two_boxes():
    assert find_crossing_time(2, 1, [[2, 3, 4, 5]]) == 23


def test_find_crossing_time_equal_efficiency_higher_index_first():
    assert find_crossing_time(2, 2, [[1, 1, 1, 1], [1, 1, 1, 1]]) == 4
