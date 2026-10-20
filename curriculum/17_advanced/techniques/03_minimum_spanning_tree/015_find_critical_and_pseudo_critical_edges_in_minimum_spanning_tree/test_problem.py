from solution import find_critical_and_pseudo_critical_edges


def test_find_critical_and_pseudo_critical_edges_normal():
    edges = [[0, 1, 1], [1, 2, 1], [2, 3, 2], [0, 3, 2], [0, 4, 3], [3, 4, 3], [1, 4, 6]]
    assert find_critical_and_pseudo_critical_edges(5, edges) == [[0, 1], [2, 3, 4, 5]]


def test_find_critical_and_pseudo_critical_edges_all_equal():
    edges = [[0, 1, 1], [1, 2, 1], [2, 3, 1], [0, 3, 1]]
    assert find_critical_and_pseudo_critical_edges(4, edges) == [[], [0, 1, 2, 3]]
