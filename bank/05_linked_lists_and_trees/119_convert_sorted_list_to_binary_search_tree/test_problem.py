from list_node import ListNode
from solution import sorted_list_to_bst
from tree_node import TreeNode


def build_list(values: list[int]) -> ListNode | None:
    head: ListNode | None = None
    for v in reversed(values):
        head = ListNode(v, head)
    return head


def inorder(root: TreeNode | None) -> list[int]:
    if root is None:
        return []
    return inorder(root.left) + [root.val] + inorder(root.right)


def balanced_height(root: TreeNode | None) -> int:
    if root is None:
        return 0
    left, right = balanced_height(root.left), balanced_height(root.right)
    if left < 0 or right < 0 or abs(left - right) > 1:
        return -1
    return 1 + max(left, right)


def check(values: list[int]) -> None:
    root = sorted_list_to_bst(build_list(values))
    assert inorder(root) == values
    assert balanced_height(root) >= 0


def test_sorted_list_to_bst_empty():
    assert sorted_list_to_bst(None) is None


def test_sorted_list_to_bst_single():
    root = sorted_list_to_bst(build_list([7]))
    assert root is not None and root.val == 7 and root.left is None and root.right is None


def test_sorted_list_to_bst_five_values():
    check([-10, -3, 0, 5, 9])


def test_sorted_list_to_bst_two_values():
    check([1, 2])


def test_sorted_list_to_bst_large_stays_balanced():
    check(list(range(1, 101)))
