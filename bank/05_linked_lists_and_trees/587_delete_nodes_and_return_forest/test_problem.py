from binary_tree import build_tree_from_level_order, tree_to_level_order
from solution import del_nodes


def forest_shapes(roots):
    return sorted((tree_to_level_order(r) for r in roots), key=lambda t: t[0])


def test_del_nodes_example_one():
    tree = build_tree_from_level_order([1, 2, 3, 4, 5, 6, 7])
    assert forest_shapes(del_nodes(tree, [3, 5])) == [[1, 2, None, 4], [6], [7]]


def test_del_nodes_leaf_only():
    tree = build_tree_from_level_order([1, 2, 4, None, 3])
    assert forest_shapes(del_nodes(tree, [3])) == [[1, 2, 4]]


def test_del_nodes_delete_root():
    tree = build_tree_from_level_order([1, 2, 3])
    assert forest_shapes(del_nodes(tree, [1])) == [[2], [3]]


def test_del_nodes_delete_nothing():
    tree = build_tree_from_level_order([1, 2])
    assert forest_shapes(del_nodes(tree, [])) == [[1, 2]]


def test_del_nodes_delete_everything():
    assert del_nodes(build_tree_from_level_order([1]), [1]) == []


def test_del_nodes_empty_tree():
    assert del_nodes(None, [1]) == []
