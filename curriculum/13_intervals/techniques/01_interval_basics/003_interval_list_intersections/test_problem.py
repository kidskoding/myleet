from solution import interval_intersection


def test_interval_intersection_empty_first_list():
    assert interval_intersection([], [[1, 5]]) == []


def test_interval_intersection_empty_second_list():
    assert interval_intersection([[1, 5]], []) == []


def test_interval_intersection_normal():
    first_list = [[0, 2], [5, 10], [13, 23], [24, 25]]
    second_list = [[1, 5], [8, 12], [15, 24], [25, 26]]
    expected = [[1, 2], [5, 5], [8, 10], [15, 23], [24, 24], [25, 25]]
    assert interval_intersection(first_list, second_list) == expected


def test_interval_intersection_no_overlap():
    assert interval_intersection([[1, 2]], [[3, 4]]) == []
