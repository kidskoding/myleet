from solution import Node, clone_graph


def build_two_node_graph() -> Node:
    node1 = Node(1)
    node2 = Node(2)
    node1.neighbors = [node2]
    node2.neighbors = [node1]
    return node1


def test_clone_graph_empty():
    assert clone_graph(None) is None


def test_clone_graph_single_node_no_neighbors():
    original = Node(1)
    cloned = clone_graph(original)

    assert cloned is not original
    assert cloned.val == 1
    assert cloned.neighbors == []


def test_clone_graph_two_connected_nodes():
    original = build_two_node_graph()
    cloned = clone_graph(original)

    assert cloned is not original
    assert cloned.val == 1
    assert len(cloned.neighbors) == 1
    assert cloned.neighbors[0].val == 2
    assert cloned.neighbors[0] is not original.neighbors[0]
