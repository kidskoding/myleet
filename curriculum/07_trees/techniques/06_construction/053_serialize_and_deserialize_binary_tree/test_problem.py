from solution import deserialize_binary_tree, serialize_binary_tree
from tree_helpers import inorder_traversal, preorder_traversal
from tree_node import TreeNode


def build_sample_tree() -> TreeNode:
    return TreeNode(
        1,
        left=TreeNode(2),
        right=TreeNode(3, left=TreeNode(4), right=TreeNode(5)),
    )


def test_serialize_round_trips():
    root = build_sample_tree()
    restored = deserialize_binary_tree(serialize_binary_tree(root))

    assert preorder_traversal(restored) == preorder_traversal(root)
    assert inorder_traversal(restored) == inorder_traversal(root)


def test_serialize_round_trips_empty_tree():
    assert deserialize_binary_tree(serialize_binary_tree(None)) is None
