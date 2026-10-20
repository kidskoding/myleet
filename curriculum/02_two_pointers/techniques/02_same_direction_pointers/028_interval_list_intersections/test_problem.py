from solution import interval_intersection


def test_interval_intersection_normal():
    first = [[0, 2], [5, 10], [13, 23], [24, 25]]
    second = [[1, 5], [8, 12], [15, 24], [25, 26]]

    assert interval_intersection(first, second) == [
        [1, 2],
        [5, 5],
        [8, 10],
        [15, 23],
        [24, 24],
        [25, 25],
    ]


def test_interval_intersection_empty_second():
    assert interval_intersection([[1, 3], [5, 9]], []) == []
