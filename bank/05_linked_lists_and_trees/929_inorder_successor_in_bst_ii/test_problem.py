from collections import deque

from solution import Node, inorder_successor


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


TREE = [5, 3, 6, 2, 4, None, None, 1]


def test_inorder_successor_leaf_goes_to_parent():
    nodes = build([2, 1, 3])
    assert inorder_successor(nodes[1]) is nodes[2]


def test_inorder_successor_largest_has_none():
    nodes = build(TREE)
    assert inorder_successor(nodes[6]) is None


def test_inorder_successor_climbs_several_levels():
    nodes = build(TREE)
    assert inorder_successor(nodes[4]) is nodes[5]


def test_inorder_successor_leftmost_of_right_subtree():
    nodes = build(TREE)
    assert inorder_successor(nodes[5]) is nodes[6]
    assert inorder_successor(nodes[3]) is nodes[4]


def test_inorder_successor_every_node_in_order():
    nodes = build(TREE)
    assert [inorder_successor(nodes[v]).val for v in (1, 2, 3, 4, 5)] == [2, 3, 4, 5, 6]


def test_inorder_successor_single_node():
    nodes = build([7])
    assert inorder_successor(nodes[7]) is None
