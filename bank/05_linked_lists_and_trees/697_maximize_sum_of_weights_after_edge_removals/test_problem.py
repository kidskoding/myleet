from solution import maximize_sum_of_weights


def test_maximize_sum_of_weights_drop_one_edge():
    assert maximize_sum_of_weights([[0, 1, 4], [0, 2, 2], [2, 3, 12], [2, 4, 6]], 2) == 22


def test_maximize_sum_of_weights_keep_everything():
    edges = [[0, 1, 5], [1, 2, 10], [0, 3, 15], [3, 4, 20], [3, 5, 5], [0, 6, 10]]
    assert maximize_sum_of_weights(edges, 3) == 65


def test_maximize_sum_of_weights_single_edge():
    assert maximize_sum_of_weights([[0, 1, 7]], 1) == 7


def test_maximize_sum_of_weights_star_keeps_heaviest():
    assert maximize_sum_of_weights([[0, 1, 3], [0, 2, 9], [0, 3, 5]], 1) == 9


def test_maximize_sum_of_weights_path_matching():
    assert maximize_sum_of_weights([[0, 1, 5], [1, 2, 6], [2, 3, 5]], 1) == 10
