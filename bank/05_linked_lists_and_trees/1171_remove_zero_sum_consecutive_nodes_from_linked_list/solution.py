from list_node import ListNode


def remove_zero_sum_sublists(head: ListNode | None) -> ListNode | None:
    dummy = ListNode(0, head)
    last: dict[int, ListNode] = {}
    prefix = 0
    node: ListNode | None = dummy
    while node is not None:
        prefix += node.val
        last[prefix] = node
        node = node.next
    prefix = 0
    node = dummy
    while node is not None:
        prefix += node.val
        node.next = last[prefix].next
        node = node.next
    return dummy.next
