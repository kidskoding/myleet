from solution import count_restricted_paths


def test_count_restricted_paths_normal():
    edges = [[1, 2, 3], [1, 3, 3], [2, 3, 1], [1, 4, 2], [5, 2, 2], [3, 5, 1], [5, 4, 10]]
    assert count_restricted_paths(5, edges) == 3


def test_count_restricted_paths_another():
    edges = [
        [1, 3, 1],
        [4, 1, 2],
        [7, 3, 4],
        [2, 5, 3],
        [5, 6, 1],
        [6, 7, 2],
        [7, 5, 3],
        [2, 6, 4],
    ]
    assert count_restricted_paths(7, edges) == 1


def test_count_restricted_paths_two_nodes():
    assert count_restricted_paths(2, [[1, 2, 5]]) == 1
