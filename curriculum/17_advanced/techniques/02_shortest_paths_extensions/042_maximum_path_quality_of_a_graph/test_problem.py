from solution import maximal_path_quality


def test_maximal_path_quality_normal():
    values = [0, 32, 10, 43]
    edges = [[0, 1, 10], [1, 2, 15], [0, 3, 10]]
    assert maximal_path_quality(values, edges, 49) == 75


def test_maximal_path_quality_stay_home():
    values = [5, 10, 15, 20]
    edges = [[0, 1, 10], [1, 2, 10], [0, 3, 10]]
    assert maximal_path_quality(values, edges, 5) == 5


def test_maximal_path_quality_loop():
    values = [1, 2, 3, 4]
    edges = [[0, 1, 10], [1, 2, 11], [2, 3, 12], [1, 3, 13]]
    assert maximal_path_quality(values, edges, 50) == 7
