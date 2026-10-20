from solution import distance_limited_paths_exist


def test_distance_limited_paths_exist_normal():
    edge_list = [[0, 1, 2], [1, 2, 4], [2, 0, 8], [1, 0, 16]]
    queries = [[0, 1, 2], [0, 2, 5]]

    assert distance_limited_paths_exist(3, edge_list, queries) == [False, True]


def test_distance_limited_paths_exist_single_edge():
    assert distance_limited_paths_exist(2, [[0, 1, 5]], [[0, 1, 10]]) == [True]


def test_distance_limited_paths_exist_limit_too_tight():
    assert distance_limited_paths_exist(2, [[0, 1, 5]], [[0, 1, 5]]) == [False]
