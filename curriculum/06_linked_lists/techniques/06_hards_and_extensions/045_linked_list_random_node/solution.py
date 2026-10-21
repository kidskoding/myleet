import random

from list_node import ListNode


class LinkedListRandomNode:
    # Problem 45: Linked List Random Node

    def __init__(self, head: ListNode | None) -> None:
        # Time: O(1)
        # Space: O(1)
        self.head = head

    def get_random(self) -> int:
        # Time: O(n)
        # Space: O(1)
        result = 0
        curr = self.head
        i = 0
        while curr is not None:
            i += 1
            if random.randrange(i) == 0:
                result = curr.val
            curr = curr.next
        return result
