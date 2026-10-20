from solution import Graph


def test_graph_example_sequence():
    graph = Graph(4, [[0, 2, 5], [0, 1, 2], [1, 2, 1], [3, 0, 3]])
    assert graph.shortest_path(3, 2) == 6
    assert graph.shortest_path(0, 3) == -1
    graph.add_edge([1, 3, 4])
    assert graph.shortest_path(0, 3) == 6


def test_graph_same_node_is_zero():
    graph = Graph(2, [[0, 1, 7]])
    assert graph.shortest_path(1, 1) == 0


def test_graph_no_edges():
    graph = Graph(3, [])
    assert graph.shortest_path(0, 2) == -1


def test_graph_added_edges_give_cheaper_path():
    graph = Graph(3, [[0, 1, 10]])
    assert graph.shortest_path(0, 1) == 10
    graph.add_edge([0, 2, 1])
    graph.add_edge([2, 1, 2])
    assert graph.shortest_path(0, 1) == 3


def test_graph_edges_are_directed():
    graph = Graph(2, [[0, 1, 5]])
    assert graph.shortest_path(1, 0) == -1
