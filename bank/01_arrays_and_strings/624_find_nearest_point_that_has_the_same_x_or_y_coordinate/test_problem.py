from solution import nearest_valid_point


def test_nearest_valid_point_example():
    assert nearest_valid_point(3, 4, [[1, 2], [3, 1], [2, 4], [2, 3], [4, 4]]) == 2


def test_nearest_valid_point_same_location():
    assert nearest_valid_point(3, 4, [[3, 4]]) == 0


def test_nearest_valid_point_none_valid():
    assert nearest_valid_point(3, 4, [[2, 3]]) == -1


def test_nearest_valid_point_tie_takes_smallest_index():
    assert nearest_valid_point(1, 1, [[1, 3], [3, 1]]) == 0


def test_nearest_valid_point_skips_invalid_closer_point():
    assert nearest_valid_point(5, 5, [[6, 6], [5, 9], [1, 5]]) == 1
