from list_node import ListNode
from tree_node import TreeNode


def sorted_list_to_bst(head: ListNode | None) -> TreeNode | None:
    # Problem 46: Convert Sorted List to Binary Search Tree
    # Time: O(n log n)
    # Space: O(log n) recursion

    if head is None:
        return None
    if head.next is None:
        return TreeNode(head.val)

    prev = None
    slow = head
    fast = head
    while fast is not None and fast.next is not None:
        prev = slow
        slow = slow.next
        fast = fast.next.next

    assert prev is not None and slow is not None
    prev.next = None

    root = TreeNode(slow.val)
    root.left = sorted_list_to_bst(head)
    root.right = sorted_list_to_bst(slow.next)
    return root
