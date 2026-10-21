from solution import minimum_distance


def test_minimum_distance_normal():
    edges = [[0, 1, 1], [1, 2, 3], [2, 3, 2], [0, 3, 4]]
    assert minimum_distance(4, edges, 0, [2, 3]) == 4


def test_minimum_distance_one_reachable():
    edges = [[0, 1, 2], [0, 2, 4], [1, 3, 1], [2, 3, 3], [3, 4, 2]]
    assert minimum_distance(5, edges, 1, [0, 4]) == 3


def test_minimum_distance_unreachable():
    edges = [[0, 1, 1], [1, 2, 3], [2, 3, 2]]
    assert minimum_distance(4, edges, 3, [0, 1]) == -1
