from solution import find_right_interval


def test_find_right_interval_single():
    assert find_right_interval([[1, 2]]) == [-1]


def test_find_right_interval_chain():
    assert find_right_interval([[3, 4], [2, 3], [1, 2]]) == [-1, 0, 1]


def test_find_right_interval_some_missing():
    assert find_right_interval([[1, 4], [2, 3], [3, 4]]) == [-1, 2, -1]


def test_find_right_interval_point_interval_is_its_own_right():
    assert find_right_interval([[1, 1], [3, 4]]) == [0, -1]


def test_find_right_interval_negative_values():
    assert find_right_interval([[-5, -3], [-3, 0], [0, 2], [10, 20]]) == [1, 2, 3, -1]


def test_find_right_interval_picks_smallest_qualifying_start():
    assert find_right_interval([[1, 2], [5, 6], [3, 4], [2, 9]]) == [3, -1, 1, -1]
