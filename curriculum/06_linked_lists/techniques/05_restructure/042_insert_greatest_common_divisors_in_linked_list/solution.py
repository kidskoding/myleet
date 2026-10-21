import math

from list_node import ListNode


def insert_greatest_common_divisors(head: ListNode | None) -> ListNode | None:
    # Problem 42: Insert Greatest Common Divisors in Linked List
    # Time: O(n log A)
    # Space: O(1)

    curr = head
    while curr is not None and curr.next is not None:
        nxt = curr.next
        inserted = ListNode(math.gcd(curr.val, nxt.val), nxt)
        curr.next = inserted
        curr = nxt
    return head
