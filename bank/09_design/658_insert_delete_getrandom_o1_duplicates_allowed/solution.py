import random
from collections import defaultdict


class RandomizedCollection:
    def __init__(self) -> None:
        self.values: list[int] = []
        self.where: dict[int, set[int]] = defaultdict(set)

    def insert(self, val: int) -> bool:
        fresh = not self.where[val]
        self.where[val].add(len(self.values))
        self.values.append(val)
        return fresh

    def remove(self, val: int) -> bool:
        if not self.where[val]:
            return False
        hole = self.where[val].pop()
        last_index = len(self.values) - 1
        last = self.values[last_index]
        if hole != last_index:
            self.values[hole] = last
            self.where[last].discard(last_index)
            self.where[last].add(hole)
        self.values.pop()
        return True

    def get_random(self) -> int:
        return random.choice(self.values)
