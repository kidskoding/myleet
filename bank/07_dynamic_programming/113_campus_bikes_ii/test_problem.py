from solution import assign_bikes


def test_assign_bikes_two_workers():
    assert assign_bikes([[0, 0], [2, 1]], [[1, 2], [3, 3]]) == 6


def test_assign_bikes_single_worker():
    assert assign_bikes([[0, 0]], [[3, 4], [1, 1]]) == 2


def test_assign_bikes_greedy_closest_pair_is_wrong():
    assert assign_bikes([[0, 0], [3, 0]], [[2, 0], [5, 0]]) == 4


def test_assign_bikes_three_workers():
    assert assign_bikes([[0, 0], [1, 1], [2, 0]], [[1, 0], [2, 2], [2, 1]]) == 4


def test_assign_bikes_spare_bikes():
    assert assign_bikes([[0, 0], [1, 0]], [[0, 5], [1, 1], [0, 1], [9, 9]]) == 2
