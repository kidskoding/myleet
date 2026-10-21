from solution import max_num_edges_to_remove


def test_max_num_edges_to_remove_normal():
    edges = [[3, 1, 2], [3, 2, 3], [1, 1, 3], [1, 2, 4], [1, 1, 2], [2, 3, 4]]
    assert max_num_edges_to_remove(4, edges) == 2


def test_max_num_edges_to_remove_impossible():
    edges = [[3, 1, 2], [3, 2, 3], [1, 1, 4], [2, 1, 4]]
    assert max_num_edges_to_remove(4, edges) == 0


def test_max_num_edges_to_remove_disconnected():
    edges = [[3, 2, 3], [1, 1, 2], [2, 3, 4]]
    assert max_num_edges_to_remove(4, edges) == -1
