from solution import assign_bikes


def test_assign_bikes_two_workers():
    assert assign_bikes([[0, 0], [2, 1]], [[1, 2], [3, 3]]) == [1, 0]


def test_assign_bikes_three_workers():
    assert assign_bikes([[0, 0], [1, 1], [2, 0]], [[1, 0], [2, 2], [2, 1]]) == [0, 2, 1]


def test_assign_bikes_tie_prefers_smaller_bike_index():
    assert assign_bikes([[0, 1], [1, 0]], [[0, 0], [1, 1]]) == [0, 1]


def test_assign_bikes_tie_prefers_smaller_worker_index():
    assert assign_bikes([[0, 0], [2, 0]], [[1, 0], [10, 0]]) == [0, 1]


def test_assign_bikes_more_bikes_than_workers():
    assert assign_bikes([[0, 0]], [[5, 5], [1, 1], [0, 2]]) == [1]
