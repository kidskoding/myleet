from solution import mst_cost


def test_mst_cost_normal():
    edges = [[0, 1, 1], [1, 2, 2], [0, 2, 3], [2, 3, 4]]
    assert mst_cost(4, edges) == 7


def test_mst_cost_disconnected():
    assert mst_cost(3, [[0, 1, 5]]) == -1


def test_mst_cost_single_node():
    assert mst_cost(1, []) == 0


def test_mst_cost_cycle_extra():
    edges = [[0, 1, 1], [1, 2, 1], [2, 0, 1], [0, 3, 5]]
    assert mst_cost(4, edges) == 7
