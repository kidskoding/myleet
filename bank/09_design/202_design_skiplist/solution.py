from __future__ import annotations

import random

MAX_LEVEL = 16
PROMOTE_PROBABILITY = 0.5


class _Node:
    def __init__(self, val: int, levels: int) -> None:
        self.val = val
        self.next: list[_Node | None] = [None] * levels


class Skiplist:
    def __init__(self) -> None:
        self.head = _Node(-1, MAX_LEVEL)
        self.levels = 1

    def _random_levels(self) -> int:
        levels = 1
        while levels < MAX_LEVEL and random.random() < PROMOTE_PROBABILITY:
            levels += 1
        return levels

    def _predecessors(self, target: int) -> list[_Node]:
        update = [self.head] * MAX_LEVEL
        node = self.head
        for level in range(self.levels - 1, -1, -1):
            nxt = node.next[level]
            while nxt is not None and nxt.val < target:
                node = nxt
                nxt = node.next[level]
            update[level] = node
        return update

    def search(self, target: int) -> bool:
        candidate = self._predecessors(target)[0].next[0]
        return candidate is not None and candidate.val == target

    def add(self, num: int) -> None:
        update = self._predecessors(num)
        levels = self._random_levels()
        self.levels = max(self.levels, levels)
        node = _Node(num, levels)
        for level in range(levels):
            node.next[level] = update[level].next[level]
            update[level].next[level] = node

    def erase(self, num: int) -> bool:
        update = self._predecessors(num)
        node = update[0].next[0]
        if node is None or node.val != num:
            return False
        for level in range(len(node.next)):
            if update[level].next[level] is node:
                update[level].next[level] = node.next[level]
        while self.levels > 1 and self.head.next[self.levels - 1] is None:
            self.levels -= 1
        return True
