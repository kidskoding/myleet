from solution import min_cost


def test_min_cost_uses_reversal():
    assert min_cost(4, [[0, 1, 3], [3, 1, 1], [2, 3, 4], [0, 2, 2]]) == 5


def test_min_cost_no_reversal_needed():
    assert min_cost(4, [[0, 2, 1], [2, 1, 1], [1, 3, 1], [2, 3, 3]]) == 3


def test_min_cost_unreachable():
    assert min_cost(3, [[1, 2, 1]]) == -1


def test_min_cost_only_reversed_edge():
    assert min_cost(2, [[1, 0, 4]]) == 8


def test_min_cost_reversal_cheaper_than_forward_route():
    assert min_cost(3, [[0, 1, 10], [2, 1, 1], [2, 0, 1]]) == 2
