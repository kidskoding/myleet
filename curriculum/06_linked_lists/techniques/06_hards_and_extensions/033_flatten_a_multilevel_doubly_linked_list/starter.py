from __future__ import annotations


class MultilevelNode:
    # Node for Flatten A Multilevel Doubly Linked List.
    def __init__(
        self,
        val: int = 0,
        prev: MultilevelNode | None = None,
        next: MultilevelNode | None = None,
        child: MultilevelNode | None = None,
    ) -> None:
        self.val = val
        self.prev = prev
        self.next = next
        self.child = child


def flatten(head: MultilevelNode | None) -> MultilevelNode | None:
    # Problem 33: Flatten a Multilevel Doubly Linked List
    # Time:
    # Space:

    raise NotImplementedError
