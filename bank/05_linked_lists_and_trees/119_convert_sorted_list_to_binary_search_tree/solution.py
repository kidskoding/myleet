from list_node import ListNode
from tree_node import TreeNode


def sorted_list_to_bst(head: ListNode | None) -> TreeNode | None:
    size = 0
    node = head
    while node is not None:
        size += 1
        node = node.next

    cur = head

    def build(lo: int, hi: int) -> TreeNode | None:
        nonlocal cur
        if lo > hi:
            return None
        mid = (lo + hi) // 2
        left = build(lo, mid - 1)
        assert cur is not None
        root = TreeNode(cur.val, left)
        cur = cur.next
        root.right = build(mid + 1, hi)
        return root

    return build(0, size - 1)
