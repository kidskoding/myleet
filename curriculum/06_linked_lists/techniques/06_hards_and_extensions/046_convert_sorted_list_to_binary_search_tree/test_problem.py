from binary_tree import height
from list_node import ListNode
from solution import sorted_list_to_bst
from tree_helpers import inorder_traversal
from tree_node import TreeNode


def build_list(values: list[int]) -> ListNode | None:
    dummy = ListNode()
    curr = dummy
    for value in values:
        curr.next = ListNode(value)
        curr = curr.next
    return dummy.next


def is_balanced(root: TreeNode | None) -> bool:
    if root is None:
        return True
    if abs(height(root.left) - height(root.right)) > 1:
        return False
    return is_balanced(root.left) and is_balanced(root.right)


def test_sorted_list_to_bst_inorder_preserved():
    values = [-10, -3, 0, 5, 9]
    root = sorted_list_to_bst(build_list(values))
    assert inorder_traversal(root) == values
    assert is_balanced(root)


def test_sorted_list_to_bst_empty():
    assert sorted_list_to_bst(None) is None


def test_sorted_list_to_bst_single():
    root = sorted_list_to_bst(build_list([1]))
    assert root is not None and root.val == 1
    assert root.left is None and root.right is None


def test_sorted_list_to_bst_two_nodes():
    values = [1, 3]
    root = sorted_list_to_bst(build_list(values))
    assert inorder_traversal(root) == values
    assert is_balanced(root)
