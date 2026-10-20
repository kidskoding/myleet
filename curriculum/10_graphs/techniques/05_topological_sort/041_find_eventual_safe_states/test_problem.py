from solution import eventual_safe_nodes


def test_eventual_safe_nodes_normal_case():
    graph = [[1, 2], [2, 3], [5], [0], [5], [], []]

    assert eventual_safe_nodes(graph) == [2, 4, 5, 6]


def test_eventual_safe_nodes_no_unsafe_nodes():
    graph = [[], [], []]

    assert eventual_safe_nodes(graph) == [0, 1, 2]
