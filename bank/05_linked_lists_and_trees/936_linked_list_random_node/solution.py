import random

from list_node import ListNode


class Solution:
    def __init__(self, head: ListNode | None) -> None:
        self.head = head

    def get_random(self) -> int:
        chosen = 0
        node = self.head
        seen = 0
        while node is not None:
            seen += 1
            if random.randrange(seen) == 0:
                chosen = node.val
            node = node.next
        return chosen
