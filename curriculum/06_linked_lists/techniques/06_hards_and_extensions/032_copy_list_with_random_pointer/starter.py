from __future__ import annotations


class RandomNode:
    # Node for Copy List With Random Pointer.
    def __init__(
        self,
        val: int = 0,
        next: RandomNode | None = None,
        random: RandomNode | None = None,
    ) -> None:
        self.val = val
        self.next = next
        self.random = random


def copy_random_list(head: RandomNode | None) -> RandomNode | None:
    # Problem 32: Copy List With Random Pointer
    # Time:
    # Space:

    raise NotImplementedError
