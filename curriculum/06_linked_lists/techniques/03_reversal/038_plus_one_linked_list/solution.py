from list_node import ListNode


def plus_one(head: ListNode | None) -> ListNode | None:
    # Problem 38: Plus One Linked List
    # Time: O(n)
    # Space: O(1)

    def reverse(node: ListNode | None) -> ListNode | None:
        prev = None
        curr = node
        while curr is not None:
            nxt = curr.next
            curr.next = prev
            prev = curr
            curr = nxt
        return prev

    head = reverse(head)
    curr = head
    carry = 1

    while curr is not None and carry:
        total = curr.val + carry
        curr.val = total % 10
        carry = total // 10
        if carry and curr.next is None:
            curr.next = ListNode(0)
        curr = curr.next

    return reverse(head)
