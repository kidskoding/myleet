from list_node import ListNode


def double_it(head: ListNode | None) -> ListNode | None:
    # Problem 39: Double a Number Represented as a Linked List
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
    carry = 0

    while curr is not None:
        total = curr.val * 2 + carry
        curr.val = total % 10
        carry = total // 10
        if carry and curr.next is None:
            curr.next = ListNode(0)
        curr = curr.next

    return reverse(head)
