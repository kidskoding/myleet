from solution import min_edge_reversals


def test_min_edge_reversals_branching():
    assert min_edge_reversals(4, [[2, 0], [2, 1], [1, 3]]) == [1, 1, 0, 2]


def test_min_edge_reversals_path():
    assert min_edge_reversals(3, [[1, 2], [2, 0]]) == [2, 0, 1]


def test_min_edge_reversals_single_edge():
    assert min_edge_reversals(2, [[0, 1]]) == [0, 1]


def test_min_edge_reversals_star_pointing_in():
    assert min_edge_reversals(4, [[1, 0], [2, 0], [3, 0]]) == [3, 2, 2, 2]
