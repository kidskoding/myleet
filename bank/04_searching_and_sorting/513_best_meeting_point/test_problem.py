from solution import min_total_distance


def test_min_total_distance_example():
    assert min_total_distance([[1, 0, 0, 0, 1], [0, 0, 0, 0, 0], [0, 0, 1, 0, 0]]) == 6


def test_min_total_distance_neighbors():
    assert min_total_distance([[1, 1]]) == 1


def test_min_total_distance_single_column():
    assert min_total_distance([[1], [0], [1]]) == 2


def test_min_total_distance_four_corners():
    assert min_total_distance([[1, 0, 1], [0, 0, 0], [1, 0, 1]]) == 8


def test_min_total_distance_cluster_pulls_median():
    assert min_total_distance([[1, 1, 1, 0, 0, 0, 1]]) == 7
