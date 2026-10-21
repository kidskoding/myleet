import random


class Solution:
    def __init__(self, n: int, blacklist: list[int]) -> None:
        self.bound = n - len(blacklist)
        black = set(blacklist)
        survivors = iter(x for x in range(self.bound, n) if x not in black)
        self.remap = {b: next(survivors) for b in blacklist if b < self.bound}

    def pick(self) -> int:
        x = random.randrange(self.bound)
        return self.remap.get(x, x)
