from collections import deque

from solution import Node, lowest_common_ancestor


def build(values: list[int | None]) -> dict[int, Node]:
    root = Node(values[0])
    nodes = {values[0]: root}
    queue = deque([root])
    i = 1
    while queue and i < len(values):
        node = queue.popleft()
        for side in ("left", "right"):
            if i < len(values) and values[i] is not None:
                child = Node(values[i], parent=node)
                setattr(node, side, child)
                nodes[values[i]] = child
                queue.append(child)
            i += 1
    return nodes


TREE = [3, 5, 1, 6, 2, 0, 8, None, None, 7, 4]


def test_lowest_common_ancestor_split_at_root():
    nodes = build(TREE)
    assert lowest_common_ancestor(nodes[5], nodes[1]) is nodes[3]


def test_lowest_common_ancestor_node_is_its_own_ancestor():
    nodes = build(TREE)
    assert lowest_common_ancestor(nodes[5], nodes[4]) is nodes[5]


def test_lowest_common_ancestor_different_depths():
    nodes = build(TREE)
    assert lowest_common_ancestor(nodes[7], nodes[8]) is nodes[3]
    assert lowest_common_ancestor(nodes[6], nodes[4]) is nodes[5]


def test_lowest_common_ancestor_same_node():
    nodes = build(TREE)
    assert lowest_common_ancestor(nodes[2], nodes[2]) is nodes[2]


def test_lowest_common_ancestor_two_node_tree():
    nodes = build([1, 2])
    assert lowest_common_ancestor(nodes[1], nodes[2]) is nodes[1]
