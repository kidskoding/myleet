from solution import count_paths


def test_count_paths_single_shortest():
    roads = [[0, 6, 7], [0, 1, 2], [1, 2, 3], [1, 3, 3], [6, 3, 3], [3, 5, 1], [6, 5, 1], [2, 5, 1], [0, 4, 5], [4, 6, 2]]
    assert count_paths(7, roads) == 4


def test_count_paths_single_node():
    assert count_paths(1, []) == 1


def test_count_paths_two_equal_routes():
    roads = [[0, 1, 1], [0, 2, 1], [1, 3, 1], [2, 3, 1]]
    assert count_paths(4, roads) == 2
