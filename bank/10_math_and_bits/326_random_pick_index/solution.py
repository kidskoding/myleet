import random


class Solution:
    def __init__(self, nums: list[int]) -> None:
        self.nums = nums

    def pick(self, target: int) -> int:
        chosen = -1
        count = 0
        for i, value in enumerate(self.nums):
            if value == target:
                count += 1
                if random.randrange(count) == 0:
                    chosen = i
        return chosen
