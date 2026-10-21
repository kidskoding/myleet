from list_node import ListNode


def remove_zero_sum_sublists(head: ListNode | None) -> ListNode | None:
    # Problem 41: Remove Zero Sum Consecutive Nodes from Linked List
    # Time: O(n)
    # Space: O(n)

    dummy = ListNode(0, head)
    seen: dict[int, ListNode] = {}
    prefix = 0
    curr = dummy

    while curr is not None:
        prefix += curr.val
        seen[prefix] = curr
        curr = curr.next

    prefix = 0
    curr = dummy
    while curr is not None:
        prefix += curr.val
        curr.next = seen[prefix].next
        curr = curr.next

    return dummy.next
