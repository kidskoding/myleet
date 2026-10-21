from solution import min_cost


def test_min_cost_example_style():
    assert min_cost(3, [[0, 1, 2], [1, 2, 3], [0, 2, 1]], 2) == 1


def test_min_cost_k_equals_n():
    assert min_cost(4, [[0, 1, 5], [1, 2, 4], [2, 3, 3]], 4) == 0


def test_min_cost_single_component():
    assert min_cost(3, [[0, 1, 1], [1, 2, 2]], 1) == 2


def test_min_cost_already_sparse():
    assert min_cost(2, [[0, 1, 7]], 1) == 7
