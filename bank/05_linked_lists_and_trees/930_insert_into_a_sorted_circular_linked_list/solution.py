from list_node import ListNode


def insert(head: ListNode | None, insert_val: int) -> ListNode:
    if head is None:
        node = ListNode(insert_val)
        node.next = node
        return node
    prev = head
    while True:
        nxt = prev.next
        assert nxt is not None
        if prev.val <= insert_val <= nxt.val:
            break
        if prev.val > nxt.val and (insert_val >= prev.val or insert_val <= nxt.val):
            break
        prev = nxt
        if prev is head:
            break
    prev.next = ListNode(insert_val, prev.next)
    return head
