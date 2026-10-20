from solution import minimum_cost


def test_minimum_cost_detour_lowers_cost():
    assert minimum_cost(5, [[0, 1, 7], [1, 3, 7], [1, 2, 1]], [[0, 3], [3, 4]]) == [1, -1]


def test_minimum_cost_parallel_edges():
    assert minimum_cost(3, [[0, 2, 7], [0, 1, 15], [1, 2, 6], [1, 2, 1]], [[1, 2]]) == [0]


def test_minimum_cost_no_edges():
    assert minimum_cost(2, [], [[0, 1]]) == [-1]


def test_minimum_cost_zero_weight_edge():
    assert minimum_cost(3, [[0, 1, 0], [1, 2, 5]], [[0, 2], [2, 1]]) == [0, 0]


def test_minimum_cost_separate_components():
    assert minimum_cost(4, [[0, 1, 6], [2, 3, 3]], [[0, 1], [2, 3], [1, 2]]) == [6, 3, -1]
