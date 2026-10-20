"""Trusted traversals that tests use to inspect trees built by a solution."""

from __future__ import annotations

from tree_node import TreeNode


def preorder_traversal(root: TreeNode | None) -> list[int]:
    if root is None:
        return []
    return [root.val] + preorder_traversal(root.left) + preorder_traversal(root.right)


def inorder_traversal(root: TreeNode | None) -> list[int]:
    if root is None:
        return []
    return inorder_traversal(root.left) + [root.val] + inorder_traversal(root.right)
